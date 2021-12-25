const WIDTH = 720
const HEIGHT = 560
const TIMER_MILLISECONDS = 100
const SQUARE_SIDE = 25

let videoElem, canvasElem

//get All Devices
async function getAllDevices() {
    let list = await navigator.mediaDevices.enumerateDevices()
    return list
}

//make button lists
function makeButtonList(devicesList, videoElem, canvasElem) {
    const deviceOptions = document.getElementById('deviceOptions')
    console.log(devicesList)
    for (let i = 0; i < devicesList.length; ++i) {
        if (devicesList[i].kind === 'videoinput') {
            let btn = document.createElement('button')
            if (devicesList[i].label !== '')
                btn.innerText = devicesList[i].label
            else btn.innerText = 'Camera'
            btn.addEventListener('click', () =>
                setVideoStream(devicesList[i].deviceId, videoElem, canvasElem)
            )
            deviceOptions.append(btn)
        }
    }
}

//define start video stream function
async function setVideoStream(id, videoElem, canvasElem) {
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

        //canvasVideoPlayback(canvasElem, videoElem)
    } catch (err) {
        console.log(err)
    }
}

function canvasVideoPlayback(canvasElem, videoElem) {
    //playback on canvas
    let context = canvasElem.getContext('2d')
    setInterval(() => {
        context.drawImage(videoElem, 0, 0, WIDTH, HEIGHT)
    }, TIMER_MILLISECONDS)
}

async function main() {
    //create canvas
    canvasElem = document.createElement('canvas')
    canvasElem.width = WIDTH
    canvasElem.height = HEIGHT
    document.body.append(canvasElem)

    //create video
    videoElem = document.createElement('video')
    videoElem.autoplay = true

    let devicesList = await getAllDevices()
    makeButtonList(devicesList, videoElem, canvasElem)

    addEventListenerOnVideoElem(videoElem)
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    //faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    //faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    //faceapi.nets.faceExpressionNet.loadFromUri("/models"),
]).then(main())

function addEventListenerOnVideoElem(videoElem) {
    //Start facedetection
    videoElem.addEventListener('playing', () => {
        const displaySize = { width: WIDTH, height: HEIGHT }

        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(
                videoElem,
                new faceapi.TinyFaceDetectorOptions()
            )
            const resizedDetections = faceapi.resizeResults(
                detections,
                displaySize
            )

            let boxes = []
            for (let i = 0; i < resizedDetections.length; ++i) {
                boxes.push({
                    fx: resizedDetections[i]._box._x,
                    fy: resizedDetections[i]._box._y,
                    fw: resizedDetections[i]._box._width,
                    fh: resizedDetections[i]._box._height,
                })
            }
            pixelAveraging(boxes)
        }, TIMER_MILLISECONDS)
    })
}

// Pixel averaging functions -------
function pixelAveraging(boxes) {
    let context = canvasElem.getContext('2d')
    context.drawImage(videoElem, 0, 0, WIDTH, HEIGHT)

    ////face boxes
    for (let i = 0; i < boxes.length; ++i) {
        context.strokeStyle = 'green'
        context.strokeRect(boxes[i].fx, boxes[i].fy, boxes[i].fw, boxes[i].fh)
    }

    let frame = context.getImageData(0, 0, WIDTH, HEIGHT)

    for (let i = 0; i < WIDTH; i += SQUARE_SIDE) {
        for (let j = 0; j < HEIGHT; j += SQUARE_SIDE) {
            let cont = false
            for (let b = 0; b < boxes.length; ++b) {
                const fx = boxes[b].fx
                const fy = boxes[b].fy
                const fw = boxes[b].fw
                const fh = boxes[b].fh
                if (
                    withinBox(i, j, fx, fy, fw, fh) ||
                    withinBox(
                        i + SQUARE_SIDE,
                        j + SQUARE_SIDE,
                        fx,
                        fy,
                        fw,
                        fh
                    ) ||
                    withinBox(i, j + SQUARE_SIDE, fx, fy, fw, fh) ||
                    withinBox(i + SQUARE_SIDE, j, fx, fy, fw, fh)
                ) {
                    cont = true
                    break
                }
            }
            if (cont === true) continue
            let ids = []
            for (let ii = 0; ii < SQUARE_SIDE; ++ii) {
                for (let jj = 0; jj < SQUARE_SIDE; ++jj) {
                    ids.push(getId(i + ii, j + jj, WIDTH, HEIGHT))
                }
            }

            let avgs = [0, 0, 0, 0] //rgba
            for (let k = 0; k < 4; k++) {
                avgs[k] = colorAverage(k, ids, frame.data)
            }

            for (let k = 0; k < 4; k++) {
                setColor(k, avgs[k], ids, frame.data)
            }
        }
    }
    context.putImageData(frame, 0, 0)
}

function setColor(k, col, ids, data) {
    if (ids.length == 0) return 0
    for (let i = 0; i < ids.length; ++i) {
        data[ids[i] + k] = col
    }
}

function colorAverage(k, ids, data) {
    if (ids.length == 0) return 0
    let sum = 0
    for (let i = 0; i < ids.length; ++i) {
        sum += data[ids[i] + k]
    }
    return sum / ids.length
}

//get array index from x,y,w,h
function getId(
    x /*0 based col num*/,
    y /*0 based row num*/,
    w /*number of pixels on width*/,
    h /*no. of pixels of height*/
) {
    let rowBeg = 4 * w * y
    let id = rowBeg + 4 * x
    return id
}

function withinBox(x, y, fx, fy, fw, fh) {
    return x >= fx && x <= fx + fw && y >= fy && y <= fy + fh
}
