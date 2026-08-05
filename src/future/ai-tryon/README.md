# Future: AI Virtual Try-On

**Not implemented in Phase 1.**

## Planned flow

1. User photo + selected garment id
2. Frontend calls **backend** only
3. Backend runs VTON model (IDM-VTON, CatVTON, Kolors, SD inpaint, Imagen, etc.)
4. Result image returned to frontend

## Security

API keys **must never** ship in the frontend. Use `AiTryOnService` against your API.
