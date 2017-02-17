const blessed = require('blessed');
const contrib = require('blessed-contrib');
const request = require('request-promise');
const API = 'http://api.net-a-porter.com/MRP/GB/en/100/0/summaries?visibility=visible&whatsNew=Now'


function init() {
    request({
        url: API,
        json: true
    }).then((json) => {
        const lowToHigh = priceLowToHigh(json);
        const difference = lowToHigh.highest - lowToHigh.lowest;
        const rangeDifference = Number((difference / 100).toFixed());
        const productBuckets = arrangeIntoBuckets(json, lowToHigh.lowest, difference, rangeDifference);
        graph(productBuckets)
    }, (err) => {
        throw err
    })
}

function graph(productRange) {
    const axis = graphAxis(productRange)
    const screen = blessed.screen();
    var bar = contrib.bar({
        label: 'Hisagram',
        barWidth: 3,
        barSpacing: 6,
        xOffset: 0,
        maxHeight: 9
    })
    screen.append(bar)
    bar.setData({
        titles: axis.xAxis,
        data: axis.yAxis
    })

    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
        return process.exit(0);
    });

    screen.render()

}


function graphAxis(productRange) {
    var xAxis = [];
    var yAxis = [];
    var ordered = [];

    for (var range in productRange) {
        ordered.push({
            range: productRange[range].range.high,
            count: productRange[range].count
        })
    }

    ordered.sort(function(a, b) {
        return parseFloat(a.range) - parseFloat(b.range);
    });

    for (var range in ordered) {
        xAxis.push(String(ordered[range].range))
        yAxis.push(ordered[range].count)
    }
    return {
        xAxis: xAxis,
        yAxis: yAxis
    }
}





function arrangeIntoBuckets(products, min, difference, range) {
    var buckets = {};
    var i = 0;
    products.summaries.forEach((product) => {
        for (topPrice = min; topPrice <= difference; i++) {
            let price = getPrice(product.price);
            if (price <= topPrice) {
                var bottomPrice = topPrice - range;
                var bracket = `${bottomPrice}-${topPrice}`
                if (!buckets[bracket]) {
                    buckets[bracket] = {
                        count: 0,
                        products: [],
                        range: {
                            low: bottomPrice,
                            high: topPrice
                        }
                    }
                } else {
                    buckets[bracket].count = buckets[bracket].count + 1;
                    buckets[bracket].products.push(product)
                }
                topPrice = min;
                break;
            }
            i++
            topPrice = topPrice + range
        }
    })
    return buckets;
}

function priceLowToHigh(products) {
    var lowest = getPrice(products.summaries[0].price);
    var highest = getPrice(products.summaries[0].price);
    products.summaries.forEach((product) => {
        var price = getPrice(product.price);

        if (price < lowest) {
            lowest = price
        }
        if (price > highest) {
            highest = price
        }
    })
    return {
        lowest: lowest,
        highest: highest
    }
}

function getPrice(price) {
    return price.amount / price.divisor;
}

init()
