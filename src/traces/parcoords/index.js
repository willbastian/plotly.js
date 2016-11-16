/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Parcoords = {};

Parcoords.attributes = require('./attributes');
Parcoords.supplyDefaults = require('./defaults');
Parcoords.calc = require('./calc');
Parcoords.plot = require('./plot');
Parcoords.colorbar = require('./colorbar');

Parcoords.moduleType = 'trace';
Parcoords.name = 'parcoords';
Parcoords.basePlotModule = require('./base_plot');
Parcoords.categories = ['parcoords', 'lineColorscale'];
Parcoords.meta = {
    description: [
        'Parallel coordinates for multidimensional exploratory data analysis.',
        'The samples are in `data`.',
        'The colors are set in `colors`.'
    ].join(' ')
};

module.exports = Parcoords;
