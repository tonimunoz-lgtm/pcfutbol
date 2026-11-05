// Run only in a trusted environment with Application Default Credentials.
// No service-account keys belong in this website or its public assets.
const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
const project=value('--project'),uid=value('--uid');
if(!args.includes('--project')||!args.includes('--uid')||!project||!uid||args.includes('--grant')===args.includes('--revoke')){
    console.error('Usage: node set-admin-role.mjs --project PROJECT --uid UID (--grant|--revoke) [--apply]');process.exit(1);
}
const {initializeApp,applicationDefault}=await import('firebase-admin/app');
const {getAuth}=await import('firebase-admin/auth');
initializeApp({credential:applicationDefault(),projectId:project});
const auth=getAuth(),user=await auth.getUser(uid),pcfAdmin=args.includes('--grant');
console.log(JSON.stringify({project,uid,email:user.email,pcfAdmin,apply:args.includes('--apply')},null,2));
if(args.includes('--apply'))await auth.setCustomUserClaims(uid,{...(user.customClaims||{}),pcfAdmin});
else console.log('Dry run. No claims changed. Add --apply to perform this operation.');
