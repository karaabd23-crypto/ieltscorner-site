// Temporary deploy-preview-only owner self-test. Never sends to a customer.
import { withLambda } from '@netlify/aws-lambda-compat';
import Stripe from 'stripe';
import crypto from 'node:crypto';
import tls from 'node:tls';
import { sendEmailWithAttachment } from './send-ebook-email.mjs';

function same(a,b) {
  const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
  return x.length>0 && x.length===y.length && crypto.timingSafeEqual(x,y);
}
async function verifySelfInbox(subject,pdf) {
  const socket=tls.connect({host:'imap.gmail.com',port:993,servername:'imap.gmail.com'});
  socket.setTimeout(25000,()=>socket.destroy(new Error('timeout')));
  let buffer='', sequence=0, wake=null, failure=null;
  socket.on('data',b=>{buffer+=b.toString('utf8');if(wake){const f=wake;wake=null;f();}});
  socket.on('error',()=>{failure=true;if(wake){const f=wake;wake=null;f();}});
  async function until(predicate) {
    const deadline=Date.now()+25000;
    while(!predicate()) {
      if(failure || Date.now()>deadline)throw new Error('mailbox_unavailable');
      await new Promise(resolve=>{wake=resolve;setTimeout(resolve,300);});
    }
  }
  async function command(text) {
    const tag='A'+(++sequence);buffer='';socket.write(tag+' '+text+'\r\n');
    await until(()=>new RegExp('(?:^|\\r\\n)'+tag+' (?:OK|NO|BAD) ').test(buffer));
    if(!new RegExp('(?:^|\\r\\n)'+tag+' OK ').test(buffer))throw new Error('mailbox_refused');
    return buffer;
  }
  try {
    await until(()=>buffer.includes('* OK'));
    await command('LOGIN '+JSON.stringify(process.env.GMAIL_USER)+' '+JSON.stringify(process.env.GMAIL_PASSWORD));
    await command('EXAMINE INBOX');
    let uid='';
    for(let i=0;i<8;i++) {
      const result=await command('UID SEARCH HEADER SUBJECT '+JSON.stringify(subject));
      const match=result.match(/\* SEARCH(?: ([0-9 ]+))?\r\n/);
      if(match?.[1]){uid=match[1].trim().split(/\s+/).pop();break;}
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    if(!uid)return false;
    const message=await command('UID FETCH '+uid+' (BODY.PEEK[])');
    return message.replace(/\r?\n/g,'').includes(pdf.toString('base64'));
  } finally {socket.end();}
}
async function handler(event) {
  if(process.env.CONTEXT!=='deploy-preview')return {statusCode:404,body:'Not available'};
  if(event.httpMethod!=='POST')return {statusCode:405,body:'Method not allowed'};
  const header=Object.entries(event.headers||{}).find(([k])=>k.toLowerCase()==='authorization')?.[1]||'';
  if(!same(header,'Bearer '+(process.env.EBOOK_ADMIN_PREVIEW_TOKEN||'')))return {statusCode:403,body:'Forbidden'};
  let smtpAccepted=false;
  try {
    const body=JSON.parse(event.body||'{}');
    if(!/^cs_live_[A-Za-z0-9]+$/.test(body.sessionId||''))return {statusCode:400,body:'Invalid request'};
    const stripe=new Stripe(process.env.STRIPE_API_KEY,{apiVersion:'2026-02-25.clover'});
    const session=await stripe.checkout.sessions.retrieve(body.sessionId);
    const allowed=new Set([process.env.EBOOK_PAYMENT_LINK_ID,...(process.env.EBOOK_PAYMENT_LINK_IDS||'').split(',')].filter(Boolean));
    if(session.payment_status!=='paid'||session.mode!=='payment'||!allowed.has(session.payment_link))return {statusCode:403,body:'Not an ebook purchase'};
    const lines=await stripe.checkout.sessions.listLineItems(session.id,{limit:100});
    if(lines.has_more||!lines.data.length||!lines.data.every(x=>x.price?.product==='prod_UPDNvyptHg6gKL'))return {statusCode:403,body:'Wrong product'};
    const res=await fetch(process.env.EBOOK_FILE_URL);
    const pdf=Buffer.from(await res.arrayBuffer());
    if(!res.ok||pdf.subarray(0,5).toString()!=='%PDF-')return {statusCode:502,body:'File unavailable'};
    // Recipient is exclusively the authenticated website sender's own mailbox.
    // No buyer address, name, session identifier or other customer data is mailed.
    const subject='Ebook delivery self-check '+crypto.randomUUID();
    await sendEmailWithAttachment({toEmail:process.env.GMAIL_USER,customerName:'Delivery self-check',pdfBuffer:pdf,pdfFilename:'Ebook-delivery-self-check.pdf',subjectOverride:subject});
    smtpAccepted=true;
    // Require the exact unique test message and matching PDF in the sender's
    // own inbox, not a transport receipt or an older message.
    let inboxVerified=false;
    try {inboxVerified=await verifySelfInbox(subject,pdf);} catch {}
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({paidPurchaseVerified:true,sameProduct:true,testRecipientIsSender:true,smtpAccepted,inboxVerified,pdfBytes:pdf.length,pdfSha256:crypto.createHash('sha256').update(pdf).digest('hex'),customerEmailsSent:0})};
  } catch {
    return {statusCode:502,headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'self_test_failed',smtpAccepted,customerEmailsSent:0})};
  }
}
export default withLambda(handler);
