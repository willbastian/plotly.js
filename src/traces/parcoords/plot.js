/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var parcoords = require('./parcoords');
var Plotly = require('../../plotly');
var Lib = require('../../lib');

module.exports = function plot(gd, cdparcoords) {

    var fullLayout = gd._fullLayout;
    var root = fullLayout._glcontainer.node();
    var data = cdparcoords.map(function(d) {return d[0];});

    var filterChangedCallback = function(value) {

        var restyleStyle = ['deepProp', 'object', 'replot', 'custom'][3];

        var range = value.changedDimension.domainFilter;
        var modelIndex = value.changedDimension.modelIndex;
        var i = value.changedDimension.index;

        if(restyleStyle === 'deepProp') {
            Plotly.restyle(gd, 'dimensions[' + i + '].constraintrange[0]', range[0]).then(function () {
                Plotly.restyle(gd, 'dimensions[' + i + '].constraintrange[1]', range[1]);
            });
        } else if(restyleStyle === 'object') {
            var newData = Lib.extendDeep(gd.data)[modelIndex];
            newData.dimensions[i].constraintrange = range.slice();
            Plotly.restyle(gd, [[newData]], modelIndex);
        } else if(restyleStyle === 'replot') {
            newData = Lib.extendDeep(gd.data);
            newData[modelIndex].dimensions[i].constraintrange = range.slice();
            Plotly.plot(gd, newData);
        } else {
            gd.emit('plotly_selected', value);
        }
    };

    parcoords(
        root,
        data,
        {
            width: fullLayout.width,
            height: fullLayout.height
        },
        {
            filterChangedCallback: filterChangedCallback
        });
};
