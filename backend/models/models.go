package models

// File is one uploaded document within a job.
type File struct {
	ID               string `json:"id"`
	JobID            string `json:"job_id"`
	OriginalFilename string `json:"original_filename"`
	FilePath         string `json:"file_path"`
	FileMime         string `json:"file_mime"`
	PageCount        int    `json:"page_count"`
	Kind             string `json:"kind"` // doc | img
	SortOrder        int    `json:"sort_order"`
}

// Job is one print order. Money values are JSON-encoded as strings with two
// decimals (e.g. "20.00") to avoid float rounding on the wire.
type Job struct {
	ID            string `json:"id"`
	MachineID     string `json:"machine_id"`
	PageCount     int    `json:"page_count"` // aggregate across files
	Color         bool   `json:"color"`
	Copies        int    `json:"copies"`
	Duplex        bool   `json:"duplex"`
	PageRangeFrom *int   `json:"page_range_from"`
	PageRangeTo   *int   `json:"page_range_to"`
	PriceTaka     string `json:"price_taka"`
	Status        string `json:"status"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
	Files         []File `json:"files"`
}

// File kind constants.
const (
	KindDoc = "doc"
	KindImg = "img"
)

// Job status constants — the full lifecycle.
const (
	StatusCreated        = "created"
	StatusPendingPayment = "pending_payment"
	StatusPaid           = "paid"
	StatusQueued         = "queued"
	StatusPrinting       = "printing"
	StatusCompleted      = "completed"
	StatusFailed         = "failed"
)

// Payment status constants.
const (
	PaymentPending   = "pending"
	PaymentSuccess   = "success"
	PaymentFailed    = "failed"
	PaymentCancelled = "cancelled"
)
