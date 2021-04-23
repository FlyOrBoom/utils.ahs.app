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
				const story = {
					title: old.articleTitle ?? '',
					author: old.articleAuthor ?? '',
					body: old.articleBody ?? '',
					blurb: '',
					notifTimestamp: 0,
					timestamp: old.articleUnixEpoch ?? 0,
					featured: old.isFeatured ?? false,
					notified: old.isNotified ?? false,
					categoryID,
					views: old.articleViews ?? 0,
					imageURLs: old.articleImages ?? [],
					videoIDs: old.articleVideoIDs ?? [],
					markdown: old.articleMd ?? turned.turndown(old.articleBody ?? ''),
					date: new Date(old.articleUnixEpoch * 1000).toLocaleDateString(undefined, {
						weekday: 'long',
						month: 'long',
						day: 'numeric'
					})
				}
				if(story.imageURLs?.length){
// 						const body = new FormData()
// 						body.append('image', article.imageURLs[0])
// 						const response = await fetch(argv.imgbb, {
// 							body,
// 							method: "POST"
// 						})
// 						const result = await response.json()
// 						const thumb = result?.data?.thumb?.url
// 						if(thumb) article.thumbURLs = [thumb]
					story.thumbURLs = [story.imageURLs[0]]
				}

				if(story.featured) featured.push([id,story.timestamp])
				if(story.notified) {
					const old_notif = await old_db('notifications/'+id)
					if(old_notif){
						Object.assign(story,{
							blurb: old_notif.notificationBody ?? story.blurb,
							notifTimestamp: old_notif.notificationUnixEpoch ?? story.timestamp,
						})
					}
				}
				console.log(story.author)

				database.ref('articles/'+id).set(filter_object(story,Object.keys(schemas.article)))
				database.ref('snippets/'+id).set(filter_object(story,Object.keys(schemas.snippet)))
				if(story.notified) database.ref('notifs/'+id).set(filter_object(story,Object.keys(schemas.notif)))
				database.ref('storys/'+id).set(story)
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
