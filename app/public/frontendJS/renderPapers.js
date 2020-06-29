document.addEventListener("DOMContentLoaded", () => {
    // Load in data
    const myData = JSON.parse(document.getElementById('my-data').innerText)
    const paperSection = document.getElementById('papers')

    fetch(myData.fetchURL)
        .then(response => response.json())
        .then(allPapers => {
            allPapers.forEach(paper => {
                renderPaper(paper)
            });
            renderMathJax()
        })


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

    function renderTitle(paperObject) {
        let titleElem = document.createElement("h3");
        let arxivID = paperObject.pdfUrl.split('/').slice(-1).pop()
        titleElem.innerHTML = ` 
            <a href=/paper/${arxivID}>            
            <h3>${paperObject.title}</h3>
            </a>`
        return titleElem
    }

    function renderAuthor(paperObject) {
        let authorElem = document.createElement("p");
        authorElem.innerHTML = `${parseAuthors(paperObject.authors)}
        <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>`
        authorElem.classList.add('lead')

        return authorElem
    }

    function renderAbstract(paperObject) {

        let abstractElem = document.createElement("p")
        paperObject.abstract = paperObject.abstract

        abstractElem.textContent = paperObject.abstract
        abstractElem.classList.add('text-muted')

        return abstractElem
    }

    function renderPaper(paperObject) {
        let outerDiv = document.createElement('div')
        outerDiv.setAttribute('id', paperObject._id)
        outerDiv.classList.add('row')

        let upvoteSidebar = document.createElement('div')
        upvoteSidebar.classList.add('col-sm-1')

        let mainDiv = document.createElement('div')
        mainDiv.classList.add('col-sm-11')

        titleElem = renderTitle(paperObject)
        authorElem = renderAuthor(paperObject)
        abstractElem = renderAbstract(paperObject)
        let upvoteElem = upvoteElement(paperObject)

        mainDiv.appendChild(titleElem)
        mainDiv.appendChild(authorElem)
        mainDiv.appendChild(abstractElem)
        mainDiv.appendChild(document.createElement("br"))

        upvoteElem.then(element => { upvoteSidebar.appendChild(element) })
        .catch(err => console.log(err))

        outerDiv.appendChild(upvoteSidebar)
        outerDiv.appendChild(mainDiv)

        paperSection.appendChild(outerDiv)
    }

    async function upvoteElement(paperObject) {
        let dbVotes = await fetch(`/api/paperVotes/${paperObject._id}`);
        dbVotes = await dbVotes.json()

        let userVotes = await fetch(`/api/userVotes`)
        userVotes = await userVotes.json()

        let newVotes = dbVotes
        let outerDiv = document.createElement('div')
        let voteElem = document.createElement('p')
        let upElem = document.createElement('i');
        let downElem = document.createElement('i');

        upElem.setAttribute('class', "fa fa-arrow-up upvote")
        upElem.setAttribute('id', "upvote")

        downElem.setAttribute('class', "fa fa-arrow-down downvote")
        downElem.setAttribute('id', "downvote")

        voteElem.setAttribute('id', 'vote-score')
        voteElem.textContent = dbVotes

        outerDiv.appendChild(upElem)
        outerDiv.appendChild(voteElem)
        outerDiv.appendChild(downElem)

        // Add class based on existing vote:
        userVotes.forEach(voteObj => {
            if (voteObj.paperID == paperObject._id) {
                // user has voted on the paper
                if (voteObj.vote == 1) {
                    upElem.classList.add('active')
                } else if (voteObj.vote == -1) {
                    downElem.classList.add('active')
                }
            }
        })

        function vote(type) {
            const buttons = { "1": upElem, "-1": downElem };

            if (buttons[type].classList.contains("active")) {
                // voteElem.textContent = score - type;
                newVotes = newVotes - type;
                buttons[type].classList.remove("active");
            } else if (buttons[-type].classList.contains("active")) {
                newVotes = newVotes + 2 * type;
                buttons[-type].classList.remove("active");
                buttons[type].classList.add("active");
            } else {
                newVotes = newVotes + type;
                buttons[type].classList.add("active");
            }
            voteElem.textContent = newVotes
            let voteToPost
            if (upElem.classList.contains('active')) {
                voteToPost = 1
            } else if (downElem.classList.contains('active')) {
                voteToPost = -1
            } else {
                voteToPost = 0
            }

            fetch(`/api/vote/${paperObject._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paperID: paperObject._id,
                    vote: voteToPost
                }),
            }).then(() => { console.log(`sent to body ${voteToPost}`) })
                .catch((error) => {
                    console.error('Error:', error);
                });

        };

        upElem.addEventListener("click", () => vote(1));
        downElem.addEventListener("click", () => vote(-1));

        return outerDiv
    }




    function renderMathJax() {
        let script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
        script.type = "text/javascript";
        script.id = "MathJax-script";
        script.async = true;
        document.getElementsByTagName('head')[0].appendChild(script);
    }

})

