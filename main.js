import './style.css'
import Chart from 'chart.js/auto'

const L = 32
const FFT_SIZE = 1024
const cosineTerms = new Float32Array(L)
const sineTerms = new Float32Array(L)
const timeData = new Float32Array(FFT_SIZE)

const audioContext = new window.AudioContext()
const gain = audioContext.createGain()
gain.gain.value = 0.5

const analyser = audioContext.createAnalyser()
analyser.fftSize = FFT_SIZE

gain
  .connect(analyser)
  .connect(audioContext.destination)

const waveFormulas = {
  sine: {
    a: '0',
    b: 'n === 1 ? 1 : 0'
  },

  triangle: {
    a: '0',
    b: '8 * Math.sin(Math.PI * n / 2) / (n * Math.PI) ** 2'
  },

  square: {
    a: '0',
    b: '(2 / (n * Math.PI)) * (1 - (-1) ** n)'
  },

  saw: {
    a: '0',
    b: '2 * ((-1) ** (n + 1)) / (n * Math.PI)'
  },

  custom: {
    a: '',
    b: ''
  }
}

const playButton = document.getElementById('play-button')

let isPlaying = false
let timeChartNeedsUpdate = false
let oscillator

function startPlayback () {
  oscillator = audioContext.createOscillator()

  const wave = audioContext.createPeriodicWave(cosineTerms, sineTerms, {
    disableNormalization: true
  })

  oscillator.setPeriodicWave(wave)
  oscillator.connect(gain)
  oscillator.start()

  playButton.setAttribute('name', 'stop-circle')
  isPlaying = true

  if (timeChartNeedsUpdate) {
    updateTimeChart()
  }
}

function setAttributes (element, attributes) {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value)
  }
}

function stopPlayback () {
  oscillator.stop()
  oscillator.disconnect()
  oscillator = null
  playButton.setAttribute('name', 'play-circle')
  isPlaying = false
}

function restartPlayback () {
  if (!isPlaying) {
    return
  }

  stopPlayback()
  startPlayback()
}

playButton.onclick = () => {
  if (isPlaying) {
    stopPlayback()
    return
  }

  startPlayback()
}

const gainSlider = document.getElementById('gain-slider')

gainSlider.addEventListener('sl-change', event => {
  gain.gain.value = event.target.value
  updateTimeChart()
})

const selectWave = document.getElementById('select-wave')

function updateFreqSliders () {
  for (let i = 0; i < L; i++) {
    const { cosineSlider, sineSlider } = freqSliders[i]
    cosineSlider.setAttribute('value', cosineTerms[i])
    sineSlider.setAttribute('value', sineTerms[i])
  }
}

function updateTimeChart () {
  if (!isPlaying) {
    timeChartNeedsUpdate = true
    return
  }

  timeChartNeedsUpdate = false

  setTimeout(() => {
    analyser.getFloatTimeDomainData(timeData)
    timeChart.data.datasets[0].data = timeData
    timeChart.update()
  }, 100)
}

function formulaToFunction (formula) {
  /* eslint-disable-next-line no-new-func */
  return new Function('n', `return ${formula}`)
}

selectWave.addEventListener('sl-change', event => {
  const { a: cosineFormula, b: sineFormula } = waveFormulas[event.target.value] || {}

  if (!cosineFormula || !sineFormula) {
    return
  }

  const cosineFunction = formulaToFunction(cosineFormula)
  const sineFunction = formulaToFunction(sineFormula)

  for (let n = 1; n < L; n++) {
    cosineTerms[n] = cosineFunction(n)
    sineTerms[n] = sineFunction(n)
  }

  restartPlayback()
  updateFreqSliders()
  updateTimeChart()

  cosineFormulaTextarea.setAttribute('value', cosineFormula)
  sineFormulaTextarea.setAttribute('value', sineFormula)
})

const timeChartContext = document.getElementById('time-domain-chart')

const timeChart = new Chart(timeChartContext, {
  type: 'line',

  data: {
    labels: Array.from({ length: FFT_SIZE }).map((_, i) => i),

    datasets: [
      {
        label: 'time domain',
        data: timeData,
        borderWidth: 1
      }
    ]
  },

  options: {
    plugins: {
      legend: {
        display: false
      }
    },

    scales: {
      x: {
        display: false
      },

      y: {
        type: 'linear',
        min: -1,
        max: 1
      }
    },

    elements: {
      point: {
        radius: 0
      }
    }
  }
})

const cosineFormulaTextarea = document.getElementById('cosine-formula-textarea')
const sineFormulaTextarea = document.getElementById('sine-formula-textarea')

cosineFormulaTextarea.addEventListener('sl-input', event => {
  const cosineFunction = formulaToFunction(event.target.value)

  for (let n = 1; n < L; n++) {
    cosineTerms[n] = cosineFunction(n)
  }

  restartPlayback()
  updateFreqSliders()
  updateTimeChart()
  switchToCustom()
})

sineFormulaTextarea.addEventListener('sl-input', event => {
  const sineFunction = formulaToFunction(event.target.value)

  for (let n = 1; n < L; n++) {
    sineTerms[n] = sineFunction(n)
  }

  restartPlayback()
  updateFreqSliders()
  updateTimeChart()
  switchToCustom()
})

function clearCosineFormula () {
  cosineFormulaTextarea.setAttribute('value', '')
}

function clearSineFormula () {
  sineFormulaTextarea.setAttribute('value', '')
}

function switchToCustom () {
  if (selectWave.value !== 'custom') {
    selectWave.setAttribute('value', 'custom')
  }
}

const freqSlidersContainer = document.getElementById('freq-sliders-container')

const freqSliders = Array.from({ length: L })
  .map((_, i) => {
    const cosineSlider = document.createElement('sl-range')
    const cosineSliderContainer = document.createElement('div')

    cosineSliderContainer.appendChild(cosineSlider)

    setAttributes(cosineSlider, {
      min: -2,
      max: 2,
      step: 0.01,
      tooltip: 'left'
    })

    cosineSlider.addEventListener('sl-change', event => {
      cosineTerms[i] = event.target.value
      restartPlayback()
      updateTimeChart()
      clearCosineFormula()
      switchToCustom()
    })

    cosineSlider.addEventListener('dblclick', () => {
      cosineTerms[i] = 0
      cosineSlider.setAttribute('value', 0)
      restartPlayback()
      updateTimeChart()
      clearCosineFormula()
      switchToCustom()
    })

    const sineSlider = document.createElement('sl-range')
    const sineSliderContainer = document.createElement('div')

    sineSliderContainer.appendChild(sineSlider)

    setAttributes(sineSlider, {
      min: -2,
      max: 2,
      step: 0.01,
      tooltip: 'left'
    })

    sineSlider.addEventListener('sl-change', event => {
      sineTerms[i] = event.target.value
      restartPlayback()
      updateTimeChart()
      clearSineFormula()
      switchToCustom()
    })

    sineSlider.addEventListener('dblclick', () => {
      sineTerms[i] = 0
      sineSlider.setAttribute('value', 0)
      restartPlayback()
      updateTimeChart()
      clearSineFormula()
      switchToCustom()
    })

    freqSlidersContainer.appendChild(cosineSliderContainer)
    freqSlidersContainer.appendChild(sineSliderContainer)

    return { cosineSlider, sineSlider }
  })
