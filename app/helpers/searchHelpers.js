const global = require('../global');

module.exports = {
    arxivQueryString: function (query) {
        return `http://export.arxiv.org/api/query?${query}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${global.resultsPerPage}`
    },
    queryToObject: function (queryString) {
        let queryObject = {}
        queryString.split('&').forEach(param => {
            if (param.includes('id_list')) {
                queryObject.id_list = param.split('=')[1]
            } else if (param.includes('search_query')) {
                let searchFields = param.split('=')[1].split('+AND+')
                searchFields.forEach(element => {
                    queryObject[element.split(':')[0]] = element.split(':')[1]
                })
            }
        })
        return queryObject
    },
    objectToQuery: function (reqBody) {
        let queryString = ''

        if (reqBody.id_list != '' && reqBody.id_list != undefined) {
            queryString += `id_list=${reqBody.id_list}&`
            reqBody.id_list = ''
        }
        let queryParams = []
        for (const key in reqBody) {
            if (reqBody[key] != '') {
                queryParams.push(`${key}:${reqBody[key]}`)
            }
        }
        queryParams.push(`(${global.astroCategories})`)
        queryString += `search_query=${queryParams.join('+AND+')}`
        return queryString
    }
}