const formatPrice = price => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price);
const formatNumber = number => new Intl.NumberFormat(undefined, { notation: 'compact', compactDisplay: 'short' }).format(number);

const convertPrices = () => {
    document.querySelectorAll('.price').forEach(element => {
        element.textContent = formatPrice(parseFloat(element.getAttribute('data-price')));
    });
};

const convertNumbers = () => {
    document.querySelectorAll('.sales').forEach(element => {
        if (element.getAttribute('data-sales') >= 100) element.textContent = `${formatNumber(parseFloat(element.getAttribute('data-sales')))}+🔥`;
        else element.textContent = `${formatNumber(parseFloat(element.getAttribute('data-sales')))}+`;
    });
    document.querySelectorAll('.reviews').forEach(element => {
        if (element.getAttribute('data-reviews') >= 1000) element.textContent = `${formatNumber(parseFloat(element.getAttribute('data-reviews')))}🔥`
        else element.textContent = `${formatNumber(parseFloat(element.getAttribute('data-reviews')))}`;
    });
};

const initialize = () => {
    convertNumbers();
    convertPrices();
};

window.addEventListener('load', initialize);
document.addEventListener('htmx:afterSwap', initialize);
