const argv = require('minimist')(process.argv.slice(2))
const fetch = require('node-fetch')
const FormData = require('form-data')
const Turndown = require('turndown')
const turned = new Turndown()

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

async function old_db(...path){
	const response = await fetch('https://arcadia-high-mobile.firebaseio.com/'+path.join('/')+'.json')
	return await response.json()
}
function filter_object(original,keys){
	return Object.keys(original)
		.filter(key => keys.includes(key))
		.reduce((obj, key) => {
		return {
			...obj,
			[key]: original[key]
			};
		}, {})
}
async function main(){

	const locationIDs = (await database.ref('locationIDs').get()).val()
	const locations = (await database.ref('locations').get()).val()
	const categories = (await database.ref('categoryIDs').get()).val()
	const schemas = (await database.ref('schemas').get()).val()

	let featured = []
	let notifs = []
	for (const locationID of locationIDs){
		for(const categoryID of locations[locationID].categoryIDs){
			console.log(locationID,categoryID)
			const remote = await old_db(locationID,categoryID)
			if(!remote) continue
			for(const id in remote){
				const old = remote[id]
				const article = {
					id,
					title: old.articleTitle ?? 'None',
					author: old.articleAuthor ?? 'None',
					body: old.articleBody ?? 'None',
					timestamp: old.articleUnixEpoch ?? 0,
					featured: old.isFeatured ?? false,
					notified: old.isNotified ?? false,
					categoryID,
				}
		
				article.markdown = old.articleMd ?? turned.turndown(article.body)
				if(old.articleImages) article.imageURLs = old.articleImages
				if(old.articleVideoIDs) article.videoIDs = old.articleVideoIDs
				article.date = new Date(article.timestamp * 1000).toLocaleDateString(undefined, {
					weekday: 'long',
					month: 'long',
					day: 'numeric'
				})
				article.views = old.articleViews ?? 0
				if(article.imageURLs?.length){
// 						const body = new FormData()
// 						body.append('image', article.imageURLs[0])
// 						const response = await fetch(argv.imgbb, {
// 							body,
// 							method: "POST"
// 						})
// 						const result = await response.json()
// 						const thumb = result?.data?.thumb?.url
// 						if(thumb) article.thumbURLs = [thumb]
					article.thumbURLs = [article.imageURLs[0]]
				}

				if(article.featured) featured.push([id,article.timestamp])
				if(article.notified) {
					const old_notif = await old_db('notifications/'+id)
					const notif = {
						title: article.title,
						blurb: old_notif?.notificationBody ?? 'None',
						categoryID,
						notifTimestamp: old_notif?.notificationUnixEpoch ?? 0,
					}
					database.ref('notifs/'+id).set(notif)
				}

				database.ref('articles/'+id).set(filter_object(article,Object.keys(schemas.article)))
				database.ref('markdowns/'+id).set(article.markdown)
				database.ref('snippets/'+id).set(filter_object(article,Object.keys(schemas.snippet)))
			}
			database
				.ref('categories/'+categoryID+'/articleIDs')
				.set(Object.keys(remote).sort((a,b)=>remote[b].articleUnixEpoch-remote[a].articleUnixEpoch))
		}
	}
	database
		.ref('categories/Featured/articleIDs')
		.set(featured.sort((a,b)=>b[1]-a[1]).map(a=>a[0]))
	process.exit()
}
