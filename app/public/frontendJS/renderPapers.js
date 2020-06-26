document.addEventListener("DOMContentLoaded", () => {
    // Load in data
    const myData = JSON.parse(document.getElementById('my-data').innerText)
    const paperSection = document.getElementById('papers')


    fetch(myData.fetchURL)
        .then(response => response.json())
        .then(allPapers => {
            addUpvoteFunctions()
            allPapers.forEach(paper => {
                renderPaper(paper)
            });
            renderMathJax()
        })


    function renderMathJax() {
        let script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
        script.type = "text/javascript";
        script.id = "MathJax-script";
        script.async = true;
        document.getElementsByTagName('head')[0].appendChild(script);
    }


    function parseAuthors(authorList) {
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


    function renderPaper(paperObject) {

        let titleElem = document.createElement("h3");
        let arxivID = paperObject.pdfUrl.split('/').slice(-1).pop()
        titleElem.innerHTML = ` 
            <a href=/paper/${arxivID}>            
            <h3>${paperObject.title}</h3>
            </a>`

        let authorElem = document.createElement("p");
        authorElem.innerHTML = `${parseAuthors(paperObject.authors)}
        <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>`

        authorElem.classList.add('lead')

        let abstractElem = document.createElement("p")
        paperObject.abstract = paperObject.abstract

        abstractElem.innerText = paperObject.abstract
        abstractElem.classList.add('text-muted')

        paperSection.appendChild(titleElem)
        paperSection.appendChild(authorElem)
        paperSection.appendChild(abstractElem)
        paperSection.appendChild(document.createElement("br"))
    }

    function addUpvoteFunctions() {
        dbVotes = 10 // Votes from databse
        let outerDiv = document.createElement('div')
        let voteElem = document.createElement('p')
        let upElem = document.createElement('i');
        let downElem = document.createElement('i');

        upElem.setAttribute('class', "fa fa-arrow-up upvote")
        upElem.setAttribute('id', "upvote")

        downElem.setAttribute('class', "fa fa-arrow-down downvote")
        downElem.setAttribute('id', "downvote")

        voteElem.setAttribute('id','vote-score')
        voteElem.innerText = dbVotes

        outerDiv.appendChild(upElem)
        outerDiv.appendChild(voteElem)
        outerDiv.appendChild(downElem)
        paperSection.appendChild(outerDiv)


        function vote(type) {
            const buttons = { "1": upElem, "-1": downElem };
            const score = Number(voteElem.textContent);

            if (buttons[type].classList.contains("active")) {
                voteElem.textContent = score - type;
                buttons[type].classList.remove("active");
            } else if (buttons[-type].classList.contains("active")) {
                voteElem.textContent = score + 2 * type;
                buttons[-type].classList.remove("active");
                buttons[type].classList.add("active");
            } else {
                voteElem.textContent = score + type;
                buttons[type].classList.add("active");
            }
        };

        upElem.addEventListener("click", () => vote(1));
        downElem.addEventListener("click", () => vote(-1));


    }



})

