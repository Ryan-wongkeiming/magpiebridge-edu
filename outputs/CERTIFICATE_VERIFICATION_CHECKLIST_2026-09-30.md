# Manual Verification Checklist for Certificate Functionality

## Prerequisites
- Logged in as a user who has earned at least one certificate
- Development server running via `npm run dev` (Command Prompt required for OneDrive)

## 1. Certificate List Page Verification
**URL**: http://localhost:3000/dashboard/certificates

**What to Verify**:
- [ ] Page loads without errors (no red error boxes in UI)
- [ ] See "No certificates found." message OR list of earned certificates
- [ ] If certificates exist, each shows:
    - Course title
    - Certificate number  
    - Completion date
    - View/Download buttons (if applicable)
- [ ] Responsive layout (try resizing browser window)

## 2. Certificate Detail Page Verification  
**URL**: http://localhost:3000/dashboard/certificates/[id]
*(Get [id] from certificate list or use validation endpoint)*

**What to Verify**:
- [ ] Page loads without errors
- [ ] Certificate details displayed:
    - Course Information (title)
    - Certificate Number
    - Issued To (user name)
    - Completion Date (formatted)
- [ ] Download Certificate button visible (if onDownload prop provided)
- [ ] Button states work correctly (hover, click, disabled if applicable)

## 3. Download Certificate Functionality Test
**URL**: http://localhost:3000/api/certificates/[id]/download
*(Get [id] from certificate list page or validation endpoint)*

**What to Verify**:
- [ ] Request returns a PDF file (check browser download or network tab)
- [ ] PDF filename follows pattern: `certificate-[CERTIFICATE_NUMBER].pdf`
- [ ] PDF opens and shows certificate content
- [ ] Proper HTTP headers:
    - Content-Type: application/pdf
    - Content-Disposition: attachment; filename="certificate-[NUMBER].pdf"

## 4. Public Certificate Validation Test
**URL**: http://localhost:3000/api/validate-certificate?certificateNumber=[NUMBER]
*(Use your actual certificate number like CERT-1790750196332-JFLD8MGMY)*

**What to Verify**:
- [ ] Returns JSON response
- [ ] Valid certificate shows: `"valid": true`
- [ ] Certificate data includes:
    - id (internal certificate ID)
    - certificateNumber
    - courseTitle
    - userName
    - completionDate
    - institutionName
- [ ] Invalid certificate number returns: `"valid": false` with error message

## 5. Certificate Flow End-to-End Test
**Complete this flow**:
1. [ ] Log in at http://localhost:3000/login
2. [ ] Go to catalog: http://localhost:3000/catalog
3. [ ] Enroll in a course
4. [ ] Complete lessons (watch to 90%+ or mark complete)
5. [ ] Pass any quizzes
6. [ ] Go to certificates: http://localhost:3000/dashboard/certificates
7. [ ] Verify new certificate appears in list
8. [ ] Click certificate to view detail page
9. [ ] Click Download Certificate button
10. [ ] Verify PDF downloads and opens correctly
11. [ ] Copy certificate number and test validation endpoint
12. [ ] Log out and test validation endpoint still works (public access)

## 6. Edge Cases to Test
**What to Verify**:
- [ ] Empty state: When no certificates, shows appropriate message
- [ ] Error handling: Invalid certificate ID redirects appropriately
- [ ] Authorization: Users can only see their own certificates (unless admin/instructor)
- [ ] Responsive design: Works on mobile/tablet/desktop views
- [ ] Loading states: Shows skeleton loaders during data fetching

## Notes for OneDrive Environment
- Always use `npm run dev` (not `npx next dev`) to start server
- Use Command Prompt, not PowerShell, for server commands
- First build after changes may take 1-2 minutes (cache rebuild)
- Subsequent hot reloads are fast

## Expected Outcomes
If all checks pass:
- ✅ Certificate system is fully functional
- ✅ No runtime errors in certificate-related pages
- ✅ Download and validation functions work correctly
- ✅ Ready for Phase 3 enhancements (catalog/completion UX improvements)

Please go through this checklist and let me know which items pass/fail, or if you need help with any specific step.