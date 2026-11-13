// Stripe payment links for each package.
// Leave a value as null to show "Join early access" instead of "Order now".
// LIVE Stripe payment links (created Nov 13, 2026). Set a value to null to show "Join early access" instead.
window.PP_ORDER_LINKS = {
  peek: 'https://buy.stripe.com/bJe14g0bzaTH5Tj4riafS00',
  party: 'https://buy.stripe.com/9B6fZa6zXbXL2H73neafS01',
  vip: 'https://buy.stripe.com/8x2aEQ7E1ge16Xn4riafS02'
};

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-plan]').forEach(function (button) {
    var url = window.PP_ORDER_LINKS[button.getAttribute('data-plan')];
    if (url) {
      button.href = url;
      button.textContent = 'Order now';
    }
  });
});
