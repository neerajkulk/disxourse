document.addEventListener("DOMContentLoaded", function (event) {
    const submitButton = document.getElementById('submit-btn')
    const searchField = document.getElementById('search-field')
    const results = document.getElementsByClassName('results')[0]
    const entries = 10;
    const categories = ['CO', 'EP', 'GA', 'HE', 'IM', 'SR']
    const arxivField = 'astro-ph'

    function clearOutput(node) {
        node.innerHTML = ''
    }

    // Functions to parse arxiv JSON
    function parseTitle(postEntry) {
        return postEntry.title['#text']
    }

    function parseArxivLink(postEntry) {
        return postEntry.id['#text']
    }

    // Return array of authors. 
    function parseAuthorList(postEntry) {
        if (Array.isArray(postEntry.author)) {
            let authors = postEntry.author.map(entry => entry.name['#text'])
            return authors
        } else {
            return [postEntry.author.name['#text']]
        }
    }

    function parseAuthors(postEntry) {
        let authorList = parseAuthorList(postEntry)
        let authorString = ''
        switch (authorList.length) {
            case 1:
                authorString = authorList[0]
                break;
            case 2:
                authorString = `${authorList[0]} and ${authorList[1]}`
                break
            default:
                authorString = authorString = `${authorList[0]} Et al.`
                break;
        }
        return authorString
    }

    function parseAbstract(postEntry) {
        return postEntry.summary['#text']
    }

    function paperObject(entry) {
        return {
            title: parseTitle(entry),
            link: parseArxivLink(entry),
            authors: parseAuthors(entry),
            abstract: parseAbstract(entry)
        }
    }

    function renderPaper(paperObject) {
        titleElem = document.createElement("h3");
        titleElem.innerHTML = `
        <a href=${paperObject.link}>            
        <h3>${paperObject.title}</h3>
        </a>`

        authorElem = document.createElement("p");
        authorElem.innerText = paperObject.authors

        abstractElem = document.createElement("p")
	abstractElem.innerHTML = `<small>${paperObject.abstract}</small>`

        results.appendChild(titleElem)
        results.appendChild(authorElem)
        results.appendChild(abstractElem)
        results.appendChild(document.createElement("br"))
    }

    function renderAllResults(outJSON) {
        if (outJSON == undefined) {
            console.log('No Results found...')
        } else {
            outJSON.forEach(entry => {
                renderPaper(paperObject(entry))
            });
        }
    }


    function searchQueryString(searchPhrase, selectedCat) {
        let search_query = ''
        let id_list = ''
        let start = '0'
        let max_results = `${entries}`

        search_query = selectedCat.map(cat => 'cat:' + arxivField + '.' + cat);
        search_query = search_query.join('+OR+')
        search_query += '+AND+all:' + searchPhrase

        let searchURL = `http://export.arxiv.org/api/query?search_query=${search_query}&id_list=${id_list}&start=${start}&max_results=${max_results}`
        return searchURL + '&sortBy=relevance'
    }

    // Returns JSON arxiv query
    function makeQuery(query, callback) {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                let outJSON = xmlToJson(xhttp.responseXML).feed.entry
                callback(outJSON)
            }
        };
        xhttp.open("GET", query, true);
        xhttp.send();
    }

    submitButton.addEventListener('click', function () {
        clearOutput(results)
        let searchPhrase = searchField.value;
        let selectedCat = categories.filter(cat => document.getElementById(cat).checked)

        let queryString = searchQueryString(searchPhrase, selectedCat)
        makeQuery(queryString, renderAllResults)
    })

});

