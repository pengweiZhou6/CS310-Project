

class BuildQueryUtil {
    // static getCoursesColumns(document) {
    //     let columns = [];
    //     if (document.getElementById('courses-columns-field-audit').checked) columns.push('audit');
    //     if (document.getElementById('courses-columns-field-avg').checked) columns.push('avg');
    //     if (document.getElementById('courses-columns-field-dept').checked) columns.push('dept');
    //     if (document.getElementById('courses-columns-field-fail').checked) columns.push('fail');
    //     if (document.getElementById('courses-columns-field-id').checked) columns.push('id');
    //     if (document.getElementById('courses-columns-field-instructor').checked) columns.push('instructor');
    //     if (document.getElementById('courses-columns-field-pass').checked) columns.push('pass');
    //     if (document.getElementById('courses-columns-field-title').checked) columns.push('title');
    //     if (document.getElementById('courses-columns-field-uuid').checked) columns.push('uuid');
    //     if (document.getElementById('courses-columns-field-year').checked) columns.push('year');
    //
    //     return columns;
    // }
    //
    // static getRoomsColumns(document) {
    //     let columns = [];
    //     if (document.getElementById('rooms-columns-field-address').checked) columns.push('address');
    //     if (document.getElementById('rooms-columns-field-fullname').checked) columns.push('fullname');
    //     if (document.getElementById('rooms-columns-field-furniture').checked) columns.push('furniture');
    //     if (document.getElementById('rooms-columns-field-href').checked) columns.push('href');
    //     if (document.getElementById('rooms-columns-field-lat').checked) columns.push('lat');
    //     if (document.getElementById('rooms-columns-field-lon').checked) columns.push('lon');
    //     if (document.getElementById('rooms-columns-field-name').checked) columns.push('name');
    //     if (document.getElementById('rooms-columns-field-number').checked) columns.push('number');
    //     if (document.getElementById('rooms-columns-field-seats').checked) columns.push('seats');
    //     if (document.getElementById('rooms-columns-field-shortname').checked) columns.push('shortname');
    //     if (document.getElementById('rooms-columns-field-type').checked) columns.push('type');
    //
    //     return columns;
    // }
    //
    // static getCoursesOrder(document) {
    //     let order = {dir: "UP", keys: []};
    //     let selector = document.querySelector("#tab-courses > form > div.form-group.order > div > div.control.order.fields > select");
    //     for (let option of selector) {
    //         if (option.selected === 'selected') {
    //             order.keys.push(option.value);
    //         }
    //     }
    //     let directionDiv = document.querySelector("#tab-courses > form > div.form-group.order > div > div.control.descending");
    //     if (directionDiv.checked) order.dir = "DOWN";
    //
    //     return order;
    // }
    //
    // static getRoomsOrder(document) {
    //     let order = {dir: "UP", keys: []};
    //     let selector = document.querySelector("#tab-rooms > form > div.form-group.order > div > div.control.order.fields > select");
    //     for (let option of selector) {
    //         if (option.selected === 'selected') {
    //             order.keys.push(option.value);
    //         }
    //     }
    //     let directionDiv = document.querySelector("#tab-rooms > form > div.form-group.order > div > div.control.descending");
    //     if (directionDiv.checked) order.dir = "DOWN";
    //
    //     return order;
    // }
    //
    // static getTransform(document, dataType) {
    //     let transformations = {GROUP: [], APPLY: []};
    //     let transforms;
    //     let groups;
    //     if (dataType === 'courses') {
    //         transforms = document.querySelector("#tab-courses > form > div.form-group.transformations > div.transformations-container");
    //         groups = document.querySelector("#tab-courses > form > div.form-group.groups > div");
    //
    //     } else {
    //         transforms =  document.querySelector("#tab-rooms > form > div.form-group.transformations > div.transformations-container");
    //         groups = document.querySelector("#tab-rooms > form > div.form-group.groups > div");
    //     }
    //
    //     for (let group of groups.children) {
    //         if (group.children[0].attributes['checked'].value === 'checked') transformations.GROUP.push(group.children[0].attributes['value'].value);
    //     }
    //     for (let child of transforms.children) {
    //         let applyKey = child.children[0].children[0].value;
    //         let applyRule = {};
    //         let key = undefined;
    //         let applyToken = '';
    //         for (let token of child.children[0].children[1]) {
    //             if (token.selected) {applyToken = token.value}
    //         }
    //         for (let token of child.children[0].children[2]) {
    //             if (token.selected) {key = token.value}
    //         }
    //         applyRule[applyKey] = {};
    //         applyRule[applyKey][applyToken] = key;
    //         transformations.APPLY.push(applyRule);
    //     }
    // }
}

