/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var ndarray = require('ndarray');


// todo most of these functions should be replaced by their 'plotly' conuterparts
// ... many of them have already been disused
module.exports = (function() {

    function range(n, increment) {
        if(increment === void(0)) {
            increment = 1;
        }
        var result = [];
        var i;
        for(i = 0; i < n; i++) {
            result.push(i * increment);
        }
        return result;
    }

    function slice64(a) {
        var result = new Float64Array(a.length);
        for(var i = 0; i < a.length; i++) {
            result[i] = a[i];
        }
        return result;
    }

    return {

        // simple throttle function
        throttle: function throttle(callback, limit) {

            var wait = false;
            return function() {
                if(!wait) {

                    callback.apply(null, arguments);
                    wait = true;
                    setTimeout(function() {
                        wait = false;
                    }, limit);
                }
            };
        },

        // typed array slice (for non-ES2015 browsers... IE11)
        slice64: slice64,

        // widen a typed array `a` to desired `columnCount` for testing
        // by repeating columns as needed
        widen: function widen(a, columnCount) {
            var origSize = a.size;
            var origShape = a.shape;
            var origColumnCount = origShape[0];
            var rowCount = origShape[1];
            var r = ndarray(new Float64Array(origSize * columnCount / origColumnCount), [columnCount, rowCount], [1, columnCount]);
            for(var j = 0; j < rowCount; j++) {
                for(var i = 0; i < columnCount; i++) {
                    r.set(i, j, a.get(i % origColumnCount, j));
                }
            }
            return r;
        },

        ndarrayOrder: function ndarrayOrder(unsortedData/* , orderByColumn */) {

            var columnCount = unsortedData.shape[0];
            var rowCount = unsortedData.shape[1];
            var orderByVector = [];
            var i, j;
            for(j = 0; j < rowCount; j++) {
                // orderByVector.push(-unsortedData.get(orderByColumn, j))
                orderByVector.push(Math.random());
            }

            var sortedSampleIndices = range(rowCount)
                .sort(function(a, b) {return orderByVector[a] < orderByVector[b] ? 1 : orderByVector[a] > orderByVector[b] ? -1 : 0;});

            var data = ndarray(slice64(unsortedData.data), unsortedData.shape, unsortedData.stride, unsortedData.offset);
            for(j = 0; j < rowCount; j++) {
                for(i = 0; i < columnCount; i++) {
                    data.set(i, j, unsortedData.get(i, sortedSampleIndices[j]));
                }
            }

            return data;

        },

        ndarrayDomains: function ndarrayDomains(data) {

            var columnCount = data.shape[0];
            var rowCount = data.shape[1];

            var domains = range(columnCount).map(function() {return [Infinity, -Infinity];});

            for(var i = 0; i < columnCount; i++) {
                for(var j = 0; j < rowCount; j++) {
                    domains[i][0] = Math.min(domains[i][0], data.get(i, j));
                    domains[i][1] = Math.max(domains[i][1], data.get(i, j));
                }
                // avoid degenerate case of domain with zero extent
                if(domains[i][0] === domains[i][1]) {
                    domains[i][0]--;
                    domains[i][1]++;
                }
            }

            return domains;
        },

        range: range,

        d3OrdinalScaleSnap: function closestValue(scale, v) {
            var i, a, prevDiff, prevValue, diff;
            for(i = 0, a = scale.range(), prevDiff = Infinity, prevValue = a[0], diff; i < a.length; i++) {
                if((diff = Math.abs(a[i] - v)) > prevDiff) {
                    return prevValue;
                }
                prevDiff = diff;
                prevValue = a[i];
            }
            return a[a.length - 1];
        }
    };

})();
