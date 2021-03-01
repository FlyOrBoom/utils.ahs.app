const argv = require('minimist')(process.argv.slice(2))
const fetch = require('node-fetch')
const FormData = require('form-data')

const firebase = require('firebase/app')
require('firebase/auth')
require('firebase/database')
const app = firebase.initializeApp({
	apiKey: argv.key,
	authDomain: 'arcadia-high-mobile.firebaseapp.com',
	databaseURL: 'https://arcadia-high-mobile.firebaseio.com',
	projectId: 'arcadia-high-mobile',
	storageBucket: 'arcadia-high-mobile.appspot.com',
	messagingSenderId: '654225823864',
	appId: '1:654225823864:web:944772a5cadae0c8b7758d'
}) 

const database = app.database('https://ahs-app.firebaseio.com') 

firebase
	.auth()
	.signInWithEmailAndPassword(argv.email,argv.password)
	.then(main)
setTimeout(()=>process.exit(),60*1000)

async function old_db(...path){
	const response = await fetch('https://arcadia-high-mobile.firebaseio.com/'+path.join('/')+'.json')
	return await response.json()
}
async function main(){
	database.ref('snippets').get().then(async function(snapshot){
		const snippets = snapshot.val()
		for (const [location_index,location] of snippets.entries()){
			for(const [category_index,category] of location.categories.entries()){
				const remote = await old_db(location.id,category.id)
				let articles = []
				for(const id in remote){
					const article = remote[id]
					article.title = article.articleTitle ?? 'None'
					article.author = article.articleAuthor ?? 'None'
					article.body = article.articleBody ?? 'None'
					const markdown = article.articleMd ?? 'None'
					article.timestamp = article.articleUnixEpoch ?? 0
					article.featured = article.isFeatured ?? false
					article.notified = article.isNotified ?? false
					if(article.articleImages) article.imageURLs = article.articleImages
					if(article.articleVideoIDs) article.videoIDs = article.articleVideoIDs
					article.date = new Date(article.timestamp * 1000).toLocaleDateString(undefined, {
						weekday: 'long',
						month: 'long',
						day: 'numeric'
					})

					delete article.articleTitle
					delete article.articleUnixEpoch
					delete article.articleImages
					delete article.articleVideoIDs
					delete article.articleAuthor
					delete article.articleBody
					delete article.articleMd
					delete article.hasHTML
					delete article.isNotified
					delete article.isFeatured
					delete article.articleDate

					database.ref('articles/'+id).set(article)
					database.ref('markdown/'+id).set(markdown)

					delete article.author
					delete article.body
					delete article.date
					delete article.videoIDs

					article.id = id
					if(article.imageURLs?.length){
						const body = new FormData()
						body.append('image', article.imageURLs[0])
						const response = await fetch(argv.imgbb, {
							body,
							method: "POST"
						})
						const result = await response.json()
						const thumb = result?.data?.thumb?.url
						if(thumb) article.thumbURLs = [thumb]
					}
					delete article.imageURLs
					articles.push(article)
				}
				if(argv.debug) continue
				database
					.ref('snippets/'+location_index+'/categories/'+category_index+'/articles')
					.set(articles.sort((a,b)=>b.timestamp-a.timestamp))
			}
		}
	})
}
