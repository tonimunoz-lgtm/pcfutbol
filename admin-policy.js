// Custom claims are issued only by a trusted Admin SDK environment.
// The existing administrator remains supported during migration.
export const LEGACY_ADMIN_EMAIL='tonaco92@gmail.com';
export async function resolveAdmin(user){
    if(!user)return false;
    if(String(user.email||'').toLowerCase()===LEGACY_ADMIN_EMAIL)return true;
    try{return (await user.getIdTokenResult()).claims.pcfAdmin===true;}
    catch(_){return false;}
}
