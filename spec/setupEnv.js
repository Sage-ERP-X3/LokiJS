const loki = require('../src/lokijs');

beforeEach(()=>{
    globalThis.loki = loki;
    console.log(loki);

});