import express from "express";
import { vidsrcBase } from "./src/common.js";
import { load } from "cheerio";
import { getVidsrcMovieSourcesId, getVidsrcShowSourcesId, getVidsrcSourceDetails, getVidsrcSources } from "./src/main.js";
import { encodeId, getFutoken } from "./src/utils.js";
import axios from "axios";
import randomUseragent from 'random-useragent';

const app = express()
const port = 3000

randomUseragent.getRandom();
//console.log(randomUseragent)

var ip = (Math.floor(Math.random() * 255) + 1)+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255));
//console.log(ip)

//app.use(function (req, res, next) {
    //if (req.originalUrl && req.originalUrl.split("/").pop() === 'favicon.ico') {
        //return res.sendStatus(204);
    //}
    //next();
//});

app.get('/', (req, res) => {
    res.status(200).json({
        intro: "Unofficial vidsrc.to API",
        routes: {
            movie: "/:movieTMDBid",
            show: "/:showTMDBid/:seasonNumber/:episodeNumber"
        },
        author: "by AijaZ"
    })
})

app.get('/:movieTMDBid', async(req, res) => {
    const movieId = req.params.movieTMDBid;
    
    const sourcesId = await getVidsrcMovieSourcesId(movieId);
    //console.log("sourcesId: ",sourcesId); 
    if(!sourcesId) res.status(404).send({
        status: 404,
        return: "Oops movie not available"
    });

    const sources = await getVidsrcSources(sourcesId);
    
    //console.log("sources",sources);

    const vidplay = sources.data.result.find((v) => v.title.toLowerCase() === 'f2cloud');

    if(!vidplay) res.status(404).json('vidplay stream not found for vidsrc');

    const vidplayLink = await getVidsrcSourceDetails(vidplay.id);

    //console.log("vidplayLink: ", vidplayLink);
    
    const key = await encodeId(vidplayLink.split('/e/')[1].split('?')[0]);
    const data = await getFutoken(key, vidplayLink);

    //console.log("key: ",key);
    //console.log("data: ",data);

    let subtitles;
    //if(vidplayLink.includes('sub.info='))
    {
        //const subtitleLink = vidplayLink.split('?sub.info=')[1].split('&')[0];
        //const subtitlesFetch = await axios.get(decodeURIComponent(subtitleLink));
		const data = await axios.get(`${vidsrcBase}/embed/movie/${movieId}`);
		const doc = load(data.data);
        const sourcesCode = doc('a[data-id]').attr('data-id');
        const subtitlesFetch = await axios.get(`https://vidsrc.to/ajax/embed/episode/${sourcesCode}/subtitles`);
        subtitles = await subtitlesFetch.data;
		//console.log(sourcesCode)
    }

    //console.log("subtitles: ",subtitles);


    //console.log("fuu: ",`https://vid2v11.site/mediainfo/${data}?${vidplayLink.split('?')[1]}&autostart=true`);


    const response = await axios.get(`https://vid2v11.site/mediainfo/${data}?${vidplayLink.split('?')[1]}&autostart=true`, {
        params: {
            v: Date.now().toString(),
        },
        headers: {
			"Origin": ip,
            "Referer": vidplayLink,
			"Host": "vid2v11.site",
			"User-Agent": randomUseragent
        }
    });
    
    const result = response.data.result;

    //console.log("result: ",response.data);

    if (!result && typeof result !== 'object') {
        throw new Error('an error occured');
    }

    const source = result.sources?.[0]?.file;
    if(!source) res.status(404).send({
        status: 404,
        return: "Oops reached rate limit of this api"
    })

    res.status(200).json({
        source,subtitles
    })
})

app.get('/:showTMDBid/:seasonNum/:episodeNum', async(req, res) => {
    const showTMDBid = req.params.showTMDBid;
    const seasonNum = req.params.seasonNum;
    const episodeNum = req.params.episodeNum;

    //console.log(showTMDBid,seasonNum,episodeNum)

    const sourcesId = await getVidsrcShowSourcesId(showTMDBid, seasonNum, episodeNum);
    if(!sourcesId) res.status(404).send({
        status: 404,
        return: "Oops show not available"
    });

    const sources = await getVidsrcSources(sourcesId);

    const vidplay = sources.data.result.find((v) => v.title.toLowerCase() === 'f2cloud');

    if(!vidplay) res.status(404).json('vidplay stream not found for vidsrc');

    const vidplayLink = await getVidsrcSourceDetails(vidplay.id);
    
    const key = await encodeId(vidplayLink.split('/e/')[1].split('?')[0]);
    const data = await getFutoken(key, vidplayLink);

    let subtitles;
    //if(vidplayLink.includes('sub.info='))
    {
        //const subtitleLink = vidplayLink.split('?sub.info=')[1].split('&')[0];
        //const subtitlesFetch = await axios.get(decodeURIComponent(subtitleLink));
		const data = await axios.get(`${vidsrcBase}/embed/tv/${showTMDBid}/${seasonNum}/${episodeNum}`);
        const doc = load(data.data);
        const sourcesCode = doc('a[data-id]').attr('data-id');
        const subtitlesFetch = await axios.get(`https://vidsrc.to/ajax/embed/episode/${sourcesCode}/subtitles`);
        subtitles = await subtitlesFetch.data;
    }

    const response = await axios.get(`https://vid2v11.site/mediainfo/${data}?${vidplayLink.split('?')[1]}&autostart=true`, {
        params: {
            v: Date.now().toString(),
        },
        headers: {
			"Origin": ip,
            "Referer": vidplayLink,
			"Host": "vid2v11.site",
			"User-Agent": randomUseragent
        }
    });

    const result = response.data.result;

    if (!result && typeof result !== 'object') {
        throw new Error('an error occured');
    }

    const source = result.sources?.[0]?.file;
    if(!source) res.status(404).send({
        status: 404,
        return: "Oops reached rate limit of this api"
    })

    res.status(200).json({
        source,subtitles
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
})
