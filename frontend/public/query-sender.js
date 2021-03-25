/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        // TODO: implement!
        let xhr = new XMLHttpRequest();
        xhr.open("POST", 'http://localhost:4321/query', true);

        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onload = function () {
            if (this.status === 200) {
                fulfill(this.response);
            } else if (this.status === 400) {
                reject(this.response);
            }
        };
        // console.log("sending post.query");
        xhr.send(JSON.stringify(query));

        // console.log("sendQuery wip");
    }).catch((err) => {
        return Promise.reject(err);
    });
};
