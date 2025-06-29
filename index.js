let currentFinalAmount = null;
let paymentConfirmed = false;

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    Swal.fire({
      icon: 'success',
      title: 'Đã sao chép!',
      text: text,
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false
    });
  });
}

function showPaymentInfo() {
  currentFinalAmount = null;
  paymentConfirmed = false;
  document.getElementById("confirmBtn").disabled = false;
  document.getElementById("resultBox").innerHTML = "";

  const game = document.getElementById("game").value;
  const duration = document.getElementById("duration").value;
  const discountCode = document.getElementById("discountCode").value.trim();

  if (!game || !duration) {
    Swal.fire({
      icon: 'warning',
      title: 'Thông tin không hợp lệ!',
      text: 'Vui lòng chọn game và thời hạn!',
      confirmButtonColor: '#6366f1'
    });
    return;
  }

  const priceMap = { '1day': 10000, '7day': 39000, '30day': 129000 };
  const displayTextMap = { '1day': '1 ngày', '7day': '7 ngày', '30day': '30 ngày' };
  const originalAmount = priceMap[duration];

  if (!originalAmount) {
    Swal.fire({
      icon: 'error',
      title: 'Lỗi',
      text: 'Thời hạn không hợp lệ!',
      confirmButtonColor: '#6366f1'
    });
    return;
  }

  const product = `${displayTextMap[duration]} | ${game}`;
  const randomCode = "HQV" + Math.floor(1000 + Math.random() * 9000);

  document.getElementById("note").innerText = randomCode;
  document.getElementById("product").innerText = product;

  const url = `https://script.google.com/macros/s/AKfycbyAE8TGsEWW6dbnYTIC9dtmcldDoRshLZfe_xIbVWTmlkLe3Z0tBL7400evHYNWYfoI/exec?duration=${duration}&discountCode=${discountCode}&amount=${originalAmount}`;

  console.log("Sending GET request:", url); // Debug URL

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      const finalAmount = ('actualPay' in data) ? data.actualPay : originalAmount;
      currentFinalAmount = finalAmount;

      const displayAmount = finalAmount.toLocaleString('vi-VN') + " VNĐ";
      document.getElementById("amount").innerText = displayAmount;

      const qrUrl = `https://qr.sepay.vn/img?acc=07000021112004&bank=MBBank&amount=${finalAmount}&des=${randomCode}&template=compact`;
      document.getElementById("qrImage").src = qrUrl;

      const resultBox = document.getElementById("resultBox");
      if (data.message) {
        resultBox.innerHTML = `
          <div class="alert ${data.validDiscount ? 'alert-success' : 'alert-warning'}">
            ${data.message}
          </div>
        `;
      }

      const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
      paymentModal.show();
    })
    .catch(error => {
      console.error("Fetch error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể tải thông tin thanh toán! ' + error.message,
        confirmButtonColor: '#6366f1'
      });
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const invoiceUpload = document.getElementById("invoiceUpload");
  const previewImg = document.getElementById("previewImg");

  invoiceUpload.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
});

function confirmPayment() {
  if (paymentConfirmed) {
    Swal.fire({
      icon: 'warning',
      title: 'Đã xác nhận rồi!',
      text: 'Bạn đã xác nhận giao dịch thành công trước đó.',
      confirmButtonColor: '#6366f1'
    });
    return;
  }

  const duration = document.getElementById("duration").value;
  const game = document.getElementById("game").value;
  const note = document.getElementById("note").innerText;
  const imageInput = document.getElementById("invoiceUpload");
  const file = imageInput.files[0];

  if (!duration || !game || !file) {
    Swal.fire({
      icon: 'warning',
      title: 'Thiếu thông tin!',
      text: 'Vui lòng chọn thời hạn, game và tải ảnh hóa đơn.',
      confirmButtonColor: '#6366f1'
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imageBase64 = e.target.result;
    const formData = new FormData();
    formData.append("duration", duration);
    formData.append("game", game);
    formData.append("note", note);
    formData.append("discountCode", document.getElementById("discountCode").value.trim());
    formData.append("image", imageBase64);

    const amountToSend = (typeof currentFinalAmount === 'number') ? currentFinalAmount : { '1day': 10000, '7day': 39000, '30day': 129000 }[duration];
    formData.append("amount", amountToSend);

    const resultBox = document.getElementById("resultBox");
    resultBox.innerHTML = `⏳ Đang xử lý giao dịch...`;

    fetch("https://script.google.com/macros/s/AKfycbyAE8TGsEWW6dbnYTIC9dtmcldDoRshLZfe_xIbVWTmlkLe3Z0tBL7400evHYNWYfoI/exec", {
      method: "POST",
      body: formData
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success && data.key) {
          paymentConfirmed = true;
          document.getElementById("confirmBtn").disabled = true;
          document.getElementById("amount").innerText = data.finalAmount.toLocaleString('vi-VN') + " VNĐ";
          document.getElementById("qrImage").src = `https://qr.sepay.vn/img?acc=07000021112004&bank=MBBank&amount=${data.finalAmount}&des=${note}&template=compact`;
          resultBox.innerHTML = `
            <div class="alert alert-success">
              🎉 Key của bạn: <strong id="theKey">${data.key}</strong>
              <button class="btn btn-sm btn-light" onclick="copyText('${data.key}')">📋 Sao chép</button>
            </div>
          `;
        } else {
          resultBox.innerHTML = `<div class="alert alert-danger">❌ ${data.message || 'Lỗi không xác định!'}</div>`;
        }
      })
      .catch(error => {
        console.error("Fetch error:", error);
        resultBox.innerHTML = `<div class="alert alert-danger">❌ Không thể gửi yêu cầu đến server: ${error.message}</div>`;
      });
  };
  reader.readAsDataURL(file);
}
