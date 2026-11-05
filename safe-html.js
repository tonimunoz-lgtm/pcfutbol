export function escapeHTML(value){
    return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// A complete JS string literal, escaped for a double-quoted HTML attribute.
export const jsAttribute=value=>escapeHTML(JSON.stringify(String(value??'')));
export function safeImageURL(value){
    const text=String(value??'').trim();
    return /^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);base64,|\.?\/?assets\/)/i.test(text)?escapeHTML(text):'';
}
