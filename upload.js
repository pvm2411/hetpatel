if (document.body.dataset.page !== 'upload') {
  return;
}

const vendorForm = getEl('vendor-form');
const vendorMessage = getEl('vendor-message');
const fileInput = getEl('product-file');
let uploadedImageDataUrl = '';

fileInput?.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  uploadedImageDataUrl = await readFileAsDataUrl(file);
  vendorMessage.textContent = 'Image loaded from your device.';
  vendorMessage.style.color = 'var(--green)';
});

async function getUploadedImageDataUrl() {
  if (uploadedImageDataUrl) return uploadedImageDataUrl;
  const file = fileInput?.files?.[0];
  if (!file) return '';
  uploadedImageDataUrl = await readFileAsDataUrl(file);
  return uploadedImageDataUrl;
}

vendorForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!window.rentalApp.currentUser) {
    alert('Sign in first to add inventory.');
    window.location.href = 'auth.html';
    return;
  }

  const name = getEl('product-name').value.trim();
  const imageUrl = await getUploadedImageDataUrl();
  const description = getEl('product-description').value.trim();
  const hourlyRate = Number(getEl('product-hourly').value);
  const dailyRate = Number(getEl('product-daily').value);
  const isCompanyOwned = getEl('product-company').checked;

  if (!name || !imageUrl || !description || !hourlyRate || !dailyRate) {
    vendorMessage.textContent = 'Please complete every field before submitting and upload an image.';
    vendorMessage.style.color = 'var(--red)';
    return;
  }

  const { error } = await window.rentalApp.supabase.from('products').insert([{
    name,
    description,
    image_url: imageUrl,
    hourly_rate: hourlyRate,
    daily_rate: dailyRate,
    is_company_owned: isCompanyOwned,
    is_available: true,
    owner_id: isCompanyOwned ? null : window.rentalApp.currentUser.id
  }]);

  if (error) {
    vendorMessage.textContent = error.message;
    vendorMessage.style.color = 'var(--red)';
    return;
  }

  vendorMessage.textContent = 'Inventory item added successfully.';
  vendorMessage.style.color = 'var(--green)';
  vendorForm.reset();
  uploadedImageDataUrl = '';
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || '');
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}
