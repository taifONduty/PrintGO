package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// SSLCommerz wraps the sandbox/live payment gateway.
type SSLCommerz struct {
	StoreID   string
	StorePass string
	Sandbox   bool
	client    *http.Client
}

// NewSSLCommerz builds a gateway client.
func NewSSLCommerz(storeID, storePass string, sandbox bool) *SSLCommerz {
	return &SSLCommerz{
		StoreID:   storeID,
		StorePass: storePass,
		Sandbox:   sandbox,
		client:    &http.Client{Timeout: 20 * time.Second},
	}
}

func (s *SSLCommerz) host() string {
	if s.Sandbox {
		return "https://sandbox.sslcommerz.com"
	}
	return "https://securepay.sslcommerz.com"
}

// InitParams are the per-transaction inputs for a session.
type InitParams struct {
	TranID      string // our payment id
	Amount      string // "20.00"
	SuccessURL  string
	FailURL     string
	CancelURL   string
	IPNURL      string
	CustPhone   string
	ProductName string
}

// InitResponse is the relevant subset of the init API response.
type InitResponse struct {
	Status         string `json:"status"`
	FailedReason   string `json:"failedreason"`
	SessionKey     string `json:"sessionkey"`
	GatewayPageURL string `json:"GatewayPageURL"`
}

// InitSession creates a payment session and returns the gateway redirect URL
// plus the session key.
func (s *SSLCommerz) InitSession(ctx context.Context, p InitParams) (*InitResponse, error) {
	form := url.Values{}
	form.Set("store_id", s.StoreID)
	form.Set("store_passwd", s.StorePass)
	form.Set("total_amount", p.Amount)
	form.Set("currency", "BDT")
	form.Set("tran_id", p.TranID)
	form.Set("success_url", p.SuccessURL)
	form.Set("fail_url", p.FailURL)
	form.Set("cancel_url", p.CancelURL)
	form.Set("ipn_url", p.IPNURL)
	form.Set("shipping_method", "NO")
	form.Set("num_of_item", "1")
	form.Set("product_name", p.ProductName)
	form.Set("product_category", "printing")
	form.Set("product_profile", "non-physical-goods")
	// Customer fields are required by the gateway; this prototype has no
	// account system, so use placeholders + the verified phone if present.
	form.Set("cust_name", "PrintGO Customer")
	form.Set("cust_email", "customer@printgo.local")
	form.Set("cust_add1", "N/A")
	form.Set("cust_city", "Dhaka")
	form.Set("cust_postcode", "1000")
	form.Set("cust_country", "Bangladesh")
	phone := p.CustPhone
	if phone == "" {
		phone = "01700000000"
	}
	form.Set("cust_phone", phone)

	endpoint := s.host() + "/gwprocess/v4/api.php"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sslcommerz init request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var out InitResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("sslcommerz init decode: %w (body: %s)", err, string(body))
	}
	if !strings.EqualFold(out.Status, "SUCCESS") || out.GatewayPageURL == "" {
		return nil, fmt.Errorf("sslcommerz init not successful: status=%s reason=%s", out.Status, out.FailedReason)
	}
	return &out, nil
}

// ValidationResponse is the subset of the validation API response we trust.
type ValidationResponse struct {
	Status   string `json:"status"` // VALID | VALIDATED | INVALID_TRANSACTION | ...
	TranID   string `json:"tran_id"`
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
}

// ValidateIPN re-verifies an IPN callback against the gateway validation API
// using the val_id supplied in the callback. Never trust the raw callback —
// this server-to-server check is the source of truth.
func (s *SSLCommerz) ValidateIPN(ctx context.Context, valID string) (*ValidationResponse, error) {
	q := url.Values{}
	q.Set("val_id", valID)
	q.Set("store_id", s.StoreID)
	q.Set("store_passwd", s.StorePass)
	q.Set("format", "json")

	endpoint := s.host() + "/validator/api/validationserverAPI.php?" + q.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sslcommerz validate request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var out ValidationResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("sslcommerz validate decode: %w (body: %s)", err, string(body))
	}
	return &out, nil
}

// IsValid reports whether a validation response indicates a confirmed payment.
func (v *ValidationResponse) IsValid() bool {
	return strings.EqualFold(v.Status, "VALID") || strings.EqualFold(v.Status, "VALIDATED")
}
