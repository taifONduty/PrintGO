package services

import (
	"fmt"
	"math"
)

// PriceInput captures everything pricing depends on.
type PriceInput struct {
	PageCount     int // aggregate pages across all files
	FilesCount    int
	Copies        int
	Color         bool
	PageRangeFrom *int
	PageRangeTo   *int
}

// Rates configures per-page pricing, the service fee, and the gateway minimum.
type Rates struct {
	BW         float64
	Color      float64
	ServiceFee float64
	MinOrder   float64
}

// EffectivePages returns the number of pages actually billed:
// the page-range span if both ends are set, otherwise the full document total.
func EffectivePages(pageCount int, from, to *int) int {
	if from != nil && to != nil {
		span := *to - *from + 1
		if span < 0 {
			return 0
		}
		return span
	}
	return pageCount
}

// Price computes the order total and returns it formatted as a 2-decimal string
// (e.g. "20.00"). subtotal = effective_pages × copies × per_page_rate; a flat
// service fee is added when the job has files. Duplex has no price effect. A
// minimum order is enforced so the payment gateway accepts the transaction.
func Price(in PriceInput, r Rates) string {
	effective := EffectivePages(in.PageCount, in.PageRangeFrom, in.PageRangeTo)
	perPage := r.BW
	if in.Color {
		perPage = r.Color
	}
	subtotal := float64(effective) * float64(in.Copies) * perPage
	fee := 0.0
	if in.FilesCount > 0 {
		fee = r.ServiceFee
	}
	total := subtotal + fee
	if total < r.MinOrder {
		total = r.MinOrder
	}
	total = math.Round(total*100) / 100
	return fmt.Sprintf("%.2f", total)
}
