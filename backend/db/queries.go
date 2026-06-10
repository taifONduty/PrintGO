package db

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"printervend/models"
)

// ErrNotFound is returned when a lookup matches no row.
var ErrNotFound = errors.New("not found")

// jobColumns is the canonical SELECT list for a job. Money + timestamps are
// cast to text so they arrive as clean strings without numeric/time decoding.
const jobColumns = `
	id, machine_id, page_count, color, copies, duplex,
	page_range_from, page_range_to, price_taka::text, status,
	created_at::text, updated_at::text`

func scanJob(row pgx.Row) (*models.Job, error) {
	var j models.Job
	err := row.Scan(
		&j.ID, &j.MachineID, &j.PageCount, &j.Color, &j.Copies, &j.Duplex,
		&j.PageRangeFrom, &j.PageRangeTo, &j.PriceTaka, &j.Status,
		&j.CreatedAt, &j.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &j, nil
}

// MachineExists reports whether a machine id is registered.
func (d *DB) MachineExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := d.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM machines WHERE id=$1)`, id).Scan(&exists)
	return exists, err
}

// InsertJob creates a new empty job row with the app-generated UUID.
func (d *DB) InsertJob(ctx context.Context, j *models.Job) error {
	_, err := d.pool.Exec(ctx, `
		INSERT INTO jobs (id, machine_id, page_count, color, copies, duplex,
			page_range_from, page_range_to, price_taka, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		j.ID, j.MachineID, j.PageCount, j.Color, j.Copies, j.Duplex,
		j.PageRangeFrom, j.PageRangeTo, j.PriceTaka, j.Status,
	)
	return err
}

// InsertFile adds a file (with an app-generated id) to a job, appended at the
// end of the sort order.
func (d *DB) InsertFile(ctx context.Context, f *models.File) error {
	_, err := d.pool.Exec(ctx, `
		INSERT INTO files (id, job_id, original_filename, file_path, file_mime, page_count, kind, sort_order)
		VALUES ($1,$2,$3,$4,$5,$6,$7,
			COALESCE((SELECT MAX(sort_order)+1 FROM files WHERE job_id=$2), 0))`,
		f.ID, f.JobID, f.OriginalFilename, f.FilePath, f.FileMime, f.PageCount, f.Kind,
	)
	return err
}

// GetFiles returns the files of a job in sort order.
func (d *DB) GetFiles(ctx context.Context, jobID string) ([]models.File, error) {
	rows, err := d.pool.Query(ctx, `
		SELECT id, job_id, original_filename, file_path, file_mime, page_count, kind, sort_order
		FROM files WHERE job_id=$1 ORDER BY sort_order ASC, created_at ASC`, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	files := []models.File{}
	for rows.Next() {
		var f models.File
		if err := rows.Scan(&f.ID, &f.JobID, &f.OriginalFilename, &f.FilePath,
			&f.FileMime, &f.PageCount, &f.Kind, &f.SortOrder); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, rows.Err()
}

// FilePath returns the print-ready PDF path for a file belonging to a job.
func (d *DB) FilePath(ctx context.Context, jobID, fileID string) (string, error) {
	var path string
	err := d.pool.QueryRow(ctx, `SELECT file_path FROM files WHERE id=$1 AND job_id=$2`, fileID, jobID).Scan(&path)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return path, err
}

// DeleteFile removes a file from a job. Returns ErrNotFound if no such file.
func (d *DB) DeleteFile(ctx context.Context, jobID, fileID string) error {
	ct, err := d.pool.Exec(ctx, `DELETE FROM files WHERE id=$1 AND job_id=$2`, fileID, jobID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// RecalcPageCount sets jobs.page_count to the sum of its files' pages.
func (d *DB) RecalcPageCount(ctx context.Context, jobID string) error {
	_, err := d.pool.Exec(ctx, `
		UPDATE jobs SET page_count =
			COALESCE((SELECT SUM(page_count) FROM files WHERE job_id=$1), 0),
			updated_at=now()
		WHERE id=$1`, jobID)
	return err
}

// GetJob returns the full job (with files) by id.
func (d *DB) GetJob(ctx context.Context, id string) (*models.Job, error) {
	row := d.pool.QueryRow(ctx, `SELECT `+jobColumns+` FROM jobs WHERE id=$1`, id)
	job, err := scanJob(row)
	if err != nil {
		return nil, err
	}
	files, err := d.GetFiles(ctx, id)
	if err != nil {
		return nil, err
	}
	job.Files = files
	return job, nil
}

// UpdateConfig updates print configuration + recomputed price, and returns the
// refreshed row (with files).
func (d *DB) UpdateConfig(ctx context.Context, id string, color bool, copies int, duplex bool, from, to *int, price string) (*models.Job, error) {
	_, err := d.pool.Exec(ctx, `
		UPDATE jobs SET color=$2, copies=$3, duplex=$4, page_range_from=$5,
			page_range_to=$6, price_taka=$7, updated_at=now()
		WHERE id=$1`,
		id, color, copies, duplex, from, to, price,
	)
	if err != nil {
		return nil, err
	}
	return d.GetJob(ctx, id)
}

// SetPrice updates just the cached price (used after file add/remove).
func (d *DB) SetPrice(ctx context.Context, id, price string) error {
	_, err := d.pool.Exec(ctx, `UPDATE jobs SET price_taka=$2, updated_at=now() WHERE id=$1`, id, price)
	return err
}

// SetStatus flips a job to a new status and bumps updated_at.
func (d *DB) SetStatus(ctx context.Context, id, status string) error {
	ct, err := d.pool.Exec(ctx, `UPDATE jobs SET status=$2, updated_at=now() WHERE id=$1`, id, status)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreatePayment inserts a pending payment row and returns its id.
func (d *DB) CreatePayment(ctx context.Context, jobID, amount string) (string, error) {
	var id string
	err := d.pool.QueryRow(ctx, `
		INSERT INTO payments (job_id, amount_taka, status)
		VALUES ($1, $2, 'pending') RETURNING id`,
		jobID, amount).Scan(&id)
	return id, err
}

// SetPaymentSession stores the gateway session id on a payment row.
func (d *DB) SetPaymentSession(ctx context.Context, paymentID, sessionID string) error {
	_, err := d.pool.Exec(ctx, `UPDATE payments SET gateway_session_id=$2, updated_at=now() WHERE id=$1`, paymentID, sessionID)
	return err
}

// JobIDForPayment resolves the job id from a payment id (our SSLCommerz tran_id).
func (d *DB) JobIDForPayment(ctx context.Context, paymentID string) (string, error) {
	var jobID string
	err := d.pool.QueryRow(ctx, `SELECT job_id::text FROM payments WHERE id=$1`, paymentID).Scan(&jobID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return jobID, err
}

// FinalizePayment records the IPN outcome: payment status + raw payload.
func (d *DB) FinalizePayment(ctx context.Context, jobID, status string, payload []byte) error {
	_, err := d.pool.Exec(ctx, `
		UPDATE payments SET status=$2, ipn_payload=$3, updated_at=now()
		WHERE job_id=$1`,
		jobID, status, payload)
	return err
}

// ClaimNextJob atomically claims the oldest paid job for a machine, flips it to
// queued, updates the machine's last_seen, and returns the job (with files).
// Returns ErrNotFound when no paid job is waiting.
func (d *DB) ClaimNextJob(ctx context.Context, machineID string) (*models.Job, error) {
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `
		SELECT id FROM jobs
		WHERE machine_id=$1 AND status='paid'
		ORDER BY created_at ASC
		FOR UPDATE SKIP LOCKED
		LIMIT 1`, machineID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `UPDATE jobs SET status='queued', updated_at=now() WHERE id=$1`, id); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE machines SET last_seen=now(), status='online' WHERE id=$1`, machineID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return d.GetJob(ctx, id)
}
