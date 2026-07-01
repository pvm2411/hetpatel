if (document.body.dataset.page !== 'auth') {
  return;
}

const authEmail = getEl('auth-email');
const authPhone = getEl('auth-phone');
const emailSigninButton = getEl('email-signin');
const phoneSigninButton = getEl('phone-signin');
const googleSigninButton = getEl('google-signin');

emailSigninButton?.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  if (!email) return alert('Enter an email address.');
  const { error } = await window.rentalApp.supabase.auth.signInWithOtp({ email });
  window.handleAuthAction(null, error);
});

phoneSigninButton?.addEventListener('click', async () => {
  const phone = authPhone.value.trim();
  if (!phone) return alert('Enter a phone number with country code.');
  const { error } = await window.rentalApp.supabase.auth.signInWithOtp({ phone });
  window.handleAuthAction(null, error);
});

googleSigninButton?.addEventListener('click', async () => {
  const { error } = await window.rentalApp.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) alert(error.message);
});
