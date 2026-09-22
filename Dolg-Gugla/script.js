// На 29 января 2025 года сумма штрафа составляла 1.8 дуодециллиона рублей (1.8 * 10^39)
const BASE_DATE = new Date('2025-01-29T00:00:00Z').getTime();
const BASE_DEBT = 1.8e39;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

const classes = [
    ['', '', ''], // 0
    ['тысяча', 'тысячи', 'тысяч', true], // 1
    ['миллион', 'миллиона', 'миллионов', false], // 2
    ['миллиард', 'миллиарда', 'миллиардов', false], // 3
    ['триллион', 'триллиона', 'триллионов', false], // 4
    ['квадриллион', 'квадриллиона', 'квадриллионов', false], // 5
    ['квинтиллион', 'квинтиллиона', 'квинтиллионов', false], // 6
    ['секстиллион', 'секстиллиона', 'секстиллионов', false], // 7
    ['септиллион', 'септиллиона', 'септиллионов', false], // 8
    ['октиллион', 'октиллиона', 'октиллионов', false], // 9
    ['нониллион', 'нониллиона', 'нониллионов', false], // 10
    ['дециллион', 'дециллиона', 'дециллионов', false], // 11
    ['ундециллион', 'ундециллиона', 'ундециллионов', false], // 12
    ['дуодециллион', 'дуодециллиона', 'дуодециллионов', false], // 13
    ['тредециллион', 'тредециллиона', 'тредециллионов', false], // 14
    ['кваттуордециллион', 'кваттуордециллиона', 'кваттуордециллионов', false] // 15
];

function getWords(strNum) {
    if (strNum === '0') return 'ноль рублей';
    
    let paddedStr = strNum;
    while(paddedStr.length % 3 !== 0) paddedStr = '0' + paddedStr;
    
    const groups = [];
    for(let i = 0; i < paddedStr.length; i += 3) {
        groups.push(paddedStr.substring(i, i+3));
    }
    groups.reverse();
    
    let words = [];
    for(let i = groups.length - 1; i >= 0; i--) {
        const numStr = groups[i];
        if (numStr === '000') continue;
        
        const h = parseInt(numStr[0]);
        const t = parseInt(numStr[1]);
        const u = parseInt(numStr[2]);
        
        let groupWords = [];
        if (h > 0) groupWords.push(hundreds[h]);
        
        let isFemale = classes[i] && classes[i][3];
        
        if (t === 1) {
            groupWords.push(teens[u]);
        } else {
            if (t > 0) groupWords.push(tens[t]);
            if (u > 0) {
                groupWords.push(isFemale ? unitsFemale[u] : units[u]);
            }
        }
        
        if (i > 0 && classes[i]) {
            let form = 2; // plural genitive
            if (t !== 1) {
                if (u === 1) form = 0; // nominative
                else if (u >= 2 && u <= 4) form = 1; // genitive singular
            }
            groupWords.push(classes[i][form]);
        }
        
        words.push(groupWords.join(' '));
    }
    
    words.push('рублей');
    let res = words.join(' ');
    return res.charAt(0).toUpperCase() + res.slice(1);
}

function getDebtAtTime(timestamp) {
    const elapsedMs = timestamp - BASE_DATE;
    const weeksPassed = elapsedMs / MS_PER_WEEK;
    return BASE_DEBT * Math.pow(2, weeksPassed);
}

function getStableDigits(num) {
    let str = num.toExponential(15);
    let [mantissa, exponent] = str.split('e+');
    let baseDigits = mantissa.replace('.', '');
    let exp = parseInt(exponent, 10);
    
    let result = baseDigits;
    while (result.length < exp + 1) {
        result += '0';
    }
    return result;
}

function formatLargeNumber(num) {
    let str = num.toExponential(15);
    let [mantissa, exponent] = str.split('e+');
    let baseDigits = mantissa.replace('.', '');
    let exp = parseInt(exponent, 10);
    
    let result = baseDigits;
    while (result.length < exp + 1) {
        result += Math.floor(Math.random() * 10);
    }
    
    let formatted = '';
    for (let i = 0; i < result.length; i++) {
        formatted += result[i];
        if ((result.length - i - 1) % 3 === 0 && i !== result.length - 1) {
            formatted += ' ';
        }
    }
    
    return formatted;
}

const debtCounter = document.getElementById('debt-counter');
const debtWords = document.getElementById('debt-words');
const growthRateEl = document.getElementById('growth-rate');

function updateCounter() {
    const now = Date.now();
    const currentDebt = getDebtAtTime(now);
    
    // Вычисляем скорость прироста в секунду
    const debtInOneSecond = getDebtAtTime(now + 1000);
    const growthPerSec = debtInOneSecond - currentDebt;
    
    // Обновляем UI
    debtCounter.innerText = formatLargeNumber(currentDebt);
    debtWords.innerText = getWords(getStableDigits(currentDebt));
    growthRateEl.innerText = '₽ ' + formatLargeNumber(growthPerSec) + ' / сек';
    
    // Запускаем следующий кадр
    requestAnimationFrame(updateCounter);
}

// Инициализация
updateCounter();
