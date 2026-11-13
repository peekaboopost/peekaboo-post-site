// Stripe payment links for each package.
// Leave a value as null to show "Join early access" instead of "Order now".
// Paste the LIVE links here (https://buy.stripe.com/...) when the live Stripe account is ready.
window.PP_ORDER_LINKS = {
  peek: null,
  party: null,
  vip: null
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
