package services

import (
	"fmt"
	"math"
)

// PriceInput captures everything pricing depends on.
type PriceInput struct {
	PageCount     int
	Copies        int
	Color         bool
	PageRangeFrom *int
	PageRangeTo   *int
}

// Rates configures per-page pricing and the gateway minimum.
type Rates struct {
	BW       float64
	Color    float64
	MinOrder float64
}

// EffectivePages returns the number of pages actually billed:
// the page-range span if both ends are set, otherwise the full document.
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
// (e.g. "20.00"). Duplex has no price effect in v1. A minimum order amount is
// enforced so the payment gateway accepts the transaction.
func Price(in PriceInput, r Rates) string {
	effective := EffectivePages(in.PageCount, in.PageRangeFrom, in.PageRangeTo)
	perPage := r.BW
	if in.Color {
		perPage = r.Color
	}
	total := float64(effective) * float64(in.Copies) * perPage
	if total < r.MinOrder {
		total = r.MinOrder
	}
	// Round to 2 decimals defensively before formatting.
	total = math.Round(total*100) / 100
	return fmt.Sprintf("%.2f", total)
}
