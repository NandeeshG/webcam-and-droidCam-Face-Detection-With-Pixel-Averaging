const WIDTH = 720
const HEIGHT = 560

//create canvas
const canvasElem = document.createElement('canvas')
canvasElem.width = WIDTH
canvasElem.height = HEIGHT
document.body.append(canvasElem)

//create video
const videoElem = document.createElement('video')
videoElem.autoplay = true

//get All Devices
navigator.mediaDevices
    .enumerateDevices()
    .then((val) => {
        makeButtonList(val)
    })
    .catch((err) => console.log(err))

//make button lists
function makeButtonList(devicesList) {
    const deviceOptions = document.getElementById('deviceOptions')
    for (let i = 0; i < devicesList.length; ++i) {
        if (devicesList[i].kind === 'videoinput') {
            let btn = document.createElement('button')
            btn.innerText = devicesList[i].label
            btn.addEventListener('click', () =>
                setVideoStream(videoElem, devicesList[i].deviceId)
            )
            deviceOptions.append(btn)
        }
    }
}

//define start video stream function
async function setVideoStream(videoElem, id) {
    try {
        let st = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                width: WIDTH,
                height: HEIGHT,
                deviceId: id,
            },
        })
        videoElem.srcObject = st

        //playback on canvas
        let context = canvasElem.getContext('2d')
        setInterval(() => {
            context.drawImage(videoElem, 0, 0, WIDTH, HEIGHT)
        }, 100)
    } catch (err) {
        console.log(err)
    }
}
