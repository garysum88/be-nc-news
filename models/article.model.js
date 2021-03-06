const db = require('../db/connection.js')

exports.fetchArticle = (articleId) => {

    const queryStr = `
    SELECT articles.* ,
    COUNT(comments.comment_id) ::INT AS comment_count
    FROM articles 
    LEFT JOIN comments
    ON articles.article_id = comments.article_id
    WHERE articles.article_id = $1
    GROUP BY articles.article_id;
    `

    return db.query(queryStr,[articleId])
    .then((response)=>{
 

        if (response.rows.length === 0) {
            return Promise.reject({status: 404, message:"Article with that article_id does not exist"})
        }

        return response.rows[0]
    })
}


exports.updateArticle = (articleId,newVote) => {

    if (typeof newVote === "undefined") {
        return Promise.reject({ status : 400, message : "Bad request"})
    }

    if (typeof newVote !== "number") {
        return Promise.reject({ status : 400, message : "You should enter a number in inc_votes"})
    }

    else {
        return db.query('UPDATE articles SET votes = votes + $1 WHERE article_id = $2 RETURNING *',[newVote,articleId])
        .then(response=> {
        
            if (response.rows.length === 0) {
                return Promise.reject({status: 404, message:"Article with that article_id does not exist"})
            }
                return response.rows[0]
        })
}
}


exports.fetchAllArticles = (sort_by="created_at",order="desc",topic) => {

    let baseQueryStr = `
    SELECT articles.* ,
    COUNT(comments.comment_id) ::INT AS comment_count
    FROM articles 
    LEFT JOIN comments
    ON articles.article_id = comments.article_id
    `

    const validSortBy = ["article_id","title", "topic", "author","body","created_at","votes"];

    let sortByStr = 'ORDER BY '
    if (validSortBy.includes(sort_by)) {
    sortByStr += sort_by + " "
    }
    else {
    return Promise.reject({status : 400, message : "Bad request - invalid sort_by"})
    }



    let orderStr = ""
    if (order === "asc" || order === "ASC") {
        orderStr = "ASC"
    }
    else if (order === "desc" || order === "DESC") {
        orderStr = "DESC"
    }
    else {
        return Promise.reject({status :400 , message : "Bad request - invalid order (neither asc nor desc)"})
    }

    let sortByAndOrderStr = sortByStr + orderStr



    let whereStr = ""
    if (topic) {
        whereStr = `WHERE topic = '${topic}' `
    }
    else {
        whereStr = ""
    }
    
    let finalQueryStr = baseQueryStr + whereStr + "GROUP BY articles.article_id " + sortByAndOrderStr


    const checkTopicPromise = db.query('SELECT slug FROM topics;')

    const queryPromise =  db.query(finalQueryStr)
    
    return Promise.all([checkTopicPromise,queryPromise])
    .then((resolvedArr)=> {

        const topicArray = []

        resolvedArr[0].rows.forEach((topic)=> {
            topicArray.push(topic.slug)
        })


        if (topicArray.includes(topic) || typeof topic === "undefined") {

                return resolvedArr[1].rows

        }

        else {
            return Promise.reject({status: 400, message : "The topic you have entered does not exist"})
        }


        })

}

exports.fetchComments = (articleId) => {


    const checkArticleIdPromise =
    db.query(`SELECT * FROM articles WHERE article_id = $1`,[articleId])

    const fetchCommentsPromise = db.query('SELECT comment_id, votes, created_at, author, body FROM comments WHERE article_id = $1',[articleId])
    
    return Promise.all([checkArticleIdPromise,fetchCommentsPromise])
    .then((resolvedArr)=> {

       if (!resolvedArr[0].rows.length) {
           return Promise.reject({status: 404, message : "The article id does not exist"})
       }

       else {


        return resolvedArr[1].rows
       }

    })
}


exports.addComment = (articleId, author, commentBody) => {

    if (typeof author === "undefined" || typeof commentBody === "undefined") {
        return Promise.reject({status:400, message: "You have not sent a valid username and/or body."})
    }

    else {

    return db.query(`
    INSERT INTO comments
    (article_id , author, body)
    VALUES
    ($1,$2,$3)
    RETURNING *;
    `, [articleId, author, commentBody])
    .then((response)=>{
       return response.rows[0]
    })

    
}


}

