# `eventImage`

Upload event branding through the existing event image service.

## `bt.eventImage.uploadUrl(input)`

Create a signed image upload URL, valid for 60 seconds. PUT the file bytes to uploadUrl with its Content-Type, then save publicUrl on the event.

- **Auth:** `admin`
- **Route:** `POST /events/event-image-upload-url`

**Input**

| Field | Type | Description |
|---|---|---|
| `fileType` | string | Image MIME type. |
| `fileName` | string | Original file name, including extension. |
| `prefix` | enum | Image folder. |
| `eventId` | string | Event identifier for the storage folder. |

**Output:** object — Upload destination.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `ForbiddenError` | 403 | The token is valid but its account is not a BizTech admin. |
| `InvalidImageError` | 400 | Missing fields or a non-image file type. |

