/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

// todo remove the `devtesting` directory; for WIP development stage only
'use strict';
var parcoords = require('./../parcoords');
var mock = require('../../../../test/image/mocks/parcoords.json');
var data = mock.data[0];

var div = document.createElement('div');
document.body.appendChild(div);

data.unitToColor = require('./colors');

/*
 var tweakables =
*/

parcoords(div,
    data, // .filter(function(d) {return true || !d.integer}).slice(0, Infinity),
    mock.layout
);

// looping
/*


 function smoothstep(x) {
    return x * x * (3 - 2 * x);
}

var steps = 8;

window.s = function() {
    var i = 0;
    window.requestAnimationFrame(function anim() {
        if(i <= steps) {
            tweakables.dimensions[0].scatter = smoothstep(i / steps);
            tweakables.renderers[0]();
            tweakables.renderers[1]();
            i++;
            window.requestAnimationFrame(anim);
        }
    })
};
window.d = function() {
    var i = steps;
    window.requestAnimationFrame(function anim() {
        if(i >= 0) {
            tweakables.dimensions[0].scatter = smoothstep(i / steps);
            tweakables.renderers[0]();
            tweakables.renderers[1]();
            i--;
            window.requestAnimationFrame(anim);
        }
    });
};

var i = 0;
window.setInterval(function() {
    if ((++i) % 2) s(); else d();
}, 2000);
*/
