const argv = require('minimist')(process.argv.slice(2))
const fetch = require('node-fetch')
const FormData = require('form-data')

const firebase = require('firebase/app')
require('firebase/auth')
require('firebase/database')
const firebaseConfig = {
	apiKey: argv.key,
	authDomain: 'arcadia-high-mobile.firebaseapp.com',
	databaseURL: 'https://arcadia-high-mobile.firebaseio.com',
	projectId: 'arcadia-high-mobile',
	storageBucket: 'arcadia-high-mobile.appspot.com',
	messagingSenderId: '654225823864',
	appId: '1:654225823864:web:944772a5cadae0c8b7758d'
  }
const app = firebase.initializeApp(firebaseConfig) 

const database = firebase.database() 

firebase
	.auth()
	.signInWithEmailAndPassword(argv.email,argv.password)
	.then(main)
setTimeout(()=>process.exit(),60*1000)

async function main(){
	const locations = ['homepage','bulletin','publications','other']
	for (const location of locations){
		const response = await fetch('https://arcadia-high-mobile.firebaseio.com/'+location+'.json')
		const remote = await response.json()
		for(const category in remote){
			for(const id in remote[category]){
				const article = remote[category][id]
				database.ref('articles/'+id).set(article)
				delete article.articleVideoIDs
				delete article.articleAuthor
				delete article.articleBody
				delete article.articleMd
				delete article.hasHTML
				delete article.isNotified
				delete article.articleDate

				if(article.articleImages?.length){
					const body = new FormData()
					body.append('image', article.articleImages[0])
					const response = await fetch(argv.imgbb, {
						body,
						method: "POST"
					})
					const result = await response.json()
					const thumb = result?.data?.thumb?.url
					if(thumb) article.thumb = thumb
				}
				delete article.articleImages
			}
		}
		if(argv.debug) continue
		database.ref('snippets/'+location).set(remote)
	}
}
