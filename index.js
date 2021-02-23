async function main(){

	const urls = [
		'https://dciausd.weebly.com/articles/feed',
		'https://arcadiaquill.com/feed',
	]

	for(const url of urls){
		fetch(RSS_URL)
			.then(response => response.text())
			.then(str => new DOMParser().parseFromString(str, 'text/xml'))
			.then(xml => console.log(xml))
	}
	
}
