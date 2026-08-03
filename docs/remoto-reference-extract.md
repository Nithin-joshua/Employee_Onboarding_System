# Reference Extract from Remoto

This document outlines key reference points extracted from the `raibove/remoto` repository.

## 1. Document Field Set (Aadhaar Detail Keys)
Aadhaar details dictionary keys defined in `adharTesting.py` mapped to our `Document.extracted` target field shapes:

| Remoto Field Name | Our `Document.extracted` Target Field | Status / Flags |
|---|---|---|
| `name` | `name` | Present |
| `dob` | `dob` | Present |
| `gender` | `gender` | **Missing from our schema** (flagged: we only store basic details in personal info, no gender field is currently defined in our Employee or Document schema) |
| `aadhar` | `aadhaarNumber` | Map to `aadhaarNumber` (similar key structure) |
| `location` | `address` / `location` | **Missing from our schema** (flagged) |

## 2. Frontend Page Flow
Routes and views defined in `client/src/App.js` mapped to our system roles:

### Route / Page Checklist
- **Public pages**:
  - `Landing` (`/`): Base entry point.
  - `SignUp` (`/signup`): Employee signup.
  - `SignIn` (`/signin`): Login portal.
  - `Letter` (`/letter/:id`): Offer letter view/sign.

- **Admin/HR pages**:
  - `Dashboard` (`/dashboard`): General overview.
  - `Employee` (`/employee`): List of all employees.
  - `Account` (`/account`): Settings.
  - `SingleEmployee` (`/employee/:id`): Employee detail.
  - `EditEmployee` (`/pending-employee/:id`): Edit profile/review docs.
  - `NewEmployee` (`/new-employee`): Add employee profile.

- **Employee (NEW_HIRE) pages**:
  - `UserLanding` (`/landing/:id`): Onboarding instructions.
  - `UserDashboard` (`/dashboard/:id`): Status and step completions.

### Our System Role Mapping & Gaps
- **NEW_HIRE role**: Maps directly to `UserLanding` and `UserDashboard`.
- **HR role**: Maps directly to `Dashboard`, `Employee`, `SingleEmployee`, `EditEmployee`, and `NewEmployee`.
- **Gaps (pages we need that they do not have)**:
  - Compliance form list and signing panel (`PF_FORM11`, `PF_FORM2`, `ESI_FORM1` signing).
  - 30-60-90 milestone checklist tracker view.

## 3. Upload Handling Concept
Files are received on the server via `multer` middleware (storing temporarily in the local `uploads/` directory). The file is then uploaded to an external storage service (AWS S3) using an SDK. Once the file upload succeeds, the server runs the Python extraction script passing the public remote S3 URL location (`result.Location`). The temporary local file path is immediately removed from the server disk using `fs.unlink`.
