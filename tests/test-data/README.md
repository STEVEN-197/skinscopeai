# Test Data

Drop sample fixtures here before running automation:

- `sample_skin.jpg` — valid skin region image for analyze flow
- `sample_irrelevant.jpg` — landscape/non-body image (should be rejected by validate-image)
- `sample_lab_report.pdf` — multi-page lab report PDF
- `sample_lab_report.jpg` — photographed paper report
- `sample_prescription.jpg` — handwritten or printed prescription
- `oversized.jpg` — >10MB file for size-limit validation
- `corrupt.pdf` — truncated PDF for error-path validation

These files are NOT committed by default; obtain anonymized samples and place them locally.
