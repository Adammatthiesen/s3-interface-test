# Dynamic Storage API Doc

## PUT

Upload new data to storage

### Input

- **Headers:** `x-storage-key` / `Content-Type`
- **Data:** `ArrayBuffer`

### Responses

#### Success

```json
{
    "message": "string", 
    "key": "string"
}
```

#### Error

```json
{
    "error": "string"
}
```

## POST

Interact with database

### Input

- **Data:** `JSON`

#### Json Params

- `action` (see [Actions](#actions))
- `key` - string
- `contentType` - string
- `prefix` - string
- `identifier` - string
- `newKey` - string

#### Actions

- `resolveUrl`
  - **Params:** `{ identifier: string }`
  - **Response:** [`UrlMetadata`](#urlmetadata)
- `publicUrl`
  - **Params:** `{ key: string }`
  - **Response:** [`UrlMetadata`](#urlmetadata) `& { identifier: string }`
- `upload`
  - **Params:** `{ key: string, contentType: string }`
  - **Response:** `{ url: string, key: string }`
- `list`
  - **Params:** `{ prefix?: string, key?: string }`
  - **Response:** `{ files:` [`Files[]`](#urlmetadata) `}`
- `delete`
  - **Params:** `{ key: string }`
  - **Response:** `{ success: boolean }`
- `rename`
  - **Params:** `{ key: string, newKey: string }`
  - **Response:** `{ success: boolean, newKey: string }`
- `download`
  - **Params:** `{ key: string }`
  - **Response:** `{ url: string }`
- `cleanup`
  - **Params:** `N/A`
  - **Response:** `{ deletedCount: number }`
- `mappings`
  - **Params:** `N/A`
  - **Response:** `{ mappings:` [`UrlMetadata[]`](#urlmetadata) `}`
- `test`
  - **Params:** `N/A`
  - **Response:** `{ success: boolean, message: string, provider: string }`

All actions have the following error response:

```json
{ "error": "string" }
```

## Types

### UrlMetadata

```ts
export interface UrlMetadata {
    url: string;
    isPermanent: boolean;
    expiresAt?: number; // Unix timestamp in ms
}
```

### Files

```ts
export interface File {
    key: string | undefined;
    size: number | undefined;
    lastModified: Date | undefined;
}
```