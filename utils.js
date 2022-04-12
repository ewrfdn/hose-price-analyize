const xlsx = require('node-xlsx');
const fs = require('fs')
const path = require('path')
const { createInstance } = require('./request.js');
const getAction = async (url, options) => {
  try {
    const request = await createInstance().get(url, { params: options })
    return request.data

  } catch (e) {
    throw new Error(e)
  }
}
const sleep = (interval) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true)
    }, interval)
  })
}
const readExcel = (dir) => {
  const hasExcelFile = fs.existsSync(dir)
  if (!hasExcelFile) {
    return []
  }
  let res = []
  sheetList = xlsx.parse(dir);
  for (const sheet of sheetList) {

    const column = []
    const dataSource = []
    if (sheet.data.length > 1) {
      for (const item of sheet.data[0]) {
        column.push({ dataIndex: item, title: item })
      }
      for (let i = 1; i < sheet.data.length; i++) {
        const dataIntem = sheet.data[i]
        let record = {}
        for (let j = 0; j < sheet.data[0].length; j++) {
          key = sheet.data[0][j]
          record[key] = dataIntem[j]
        }
        dataSource.push(record)
      }
    }
    const sheetCopy = {
      name: sheet.name,
      column,
      dataSource,
    }
    res.push(sheetCopy)
  }
  return res

}
const dirExists = async (dir) => {
  const isExists = await getStat(dir)
  if (isExists && isExists.isDirectory()) {
    return true
  } else if (isExists) {
    return false
  }
  const tempDir = path.parse(dir).dir
  const status = await dirExists(tempDir)
  let mkdirStatus
  if (status) {
    mkdirStatus = fs.mkdirSync(dir)
  }
  return mkdirStatus
}

function getStat(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        resolve(false)
      } else {
        resolve(stats)
      }
    })
  })
}

const readAllExcel = () => {
  const dirList = fs.readdirSync('./data')
  const gatherData = { dataSource: [], columns: [] }
  for (const fileUrl of dirList) {
    const excelData = readExcel('./data/' + fileUrl)
    const { column = [], dataSource = [] } = excelData[0] || {}
    gatherData.columns = column
    gatherData.dataSource = gatherData.dataSource.concat(dataSource)
  }
  return gatherData
}

const writeToExcel = ({ sheets, dir }) => {
  let sheetList = []
  const hasExcelFile = fs.existsSync(dir)
  if (hasExcelFile) {
    sheetList = xlsx.parse(dir);
  }
  let index = sheetList.length
  for (const sheetData of sheets) {
    const { dataSource, columns } = sheetData
    index++
    if (!sheetData.name) {
      sheetData.name = "Sheet" + index
    }
    let sheet = sheetList.find(item => item.name === sheetData.name)
    if (!sheet) {
      sheet = {
        name: sheetData.name,
        data: []
      }
      const header = []
      for (const column of columns) {
        header.push(column.title)
      }
      sheet.data.push(header)
      sheetList.push(sheet)
    }
    for (const data of dataSource) {
      const row = []
      for (const column of columns) {
        row.push(data[column.dataIndex])
      }
      sheet.data.push(row)
    }
  }
  const buffer = xlsx.build(sheetList)
  fs.writeFileSync(dir, buffer)
}
const groupByName = (dataSource) => {
  const nameMap = {}
  for (const record of dataSource) {
    if (record.小区名称) {
      if (!nameMap[record.小区名称]) {
        nameMap[record.小区名称] = []
      }
      nameMap[record.小区名称].push(record)
    }
  }
  return nameMap
}
const caculateAverage = async (nameMap) => {
  const columns = [
    {
      dataIndex: 'name',
      title: '小区名称'
    },
    {
      dataIndex: 'averageArea',
      title: '平均建筑面积'
    },
    {
      dataIndex: 'averagePreAreaPrice',
      title: '平均每平方米价格'
    },
    {
      dataIndex: 'averagePrice',
      title: '平均价格'
    },
    {
      dataIndex: 'number',
      title: '房屋数量'
    }
  ]
  const dataSource = []
  for (const key in nameMap) {
    let totalPrice = 0
    let totalArea = 0
    for (const record of nameMap[key]) {
      const price = parseFloat(record['总价/万元']) || 0
      let area = parseFloat(record['建筑面积']) || 0
      totalArea += area
      totalPrice += price
    }
    const averagePrice = (totalPrice / nameMap[key].length).toFixed(4)
    const averageArea = (totalArea / nameMap[key].length).toFixed(2)
    const averagePreAreaPrice = (averagePrice / averageArea).toFixed(4) * 10000
    let record = {
      name: key,
      number: nameMap[key].length,
      averagePrice,
      averageArea,
      averagePreAreaPrice
    }
    dataSource.push(record)
  }
  await writeToExcel({
    sheets: [{
      columns,
      dataSource
    }],
    path: './processResult/小区统计.xlsx'
  })
}

const getMapData = (name) => {
  return getAction('https://api.map.baidu.com', {
    seckey: '322s2tW+KOCRtlNEI7QoDgrHyBFio/12KXiWaBAlqpE=,g6RfdT6x9IptsBJfCxRFU0eB9tmB-rXN6KveOFTXrTqjnZB-92193PYnw3aV5-rQZ0Qcl6xDEfHZBg44kIIfHXe8OjMfDSQ9pdB3gCRYHoIux2O_QfVMaNhwIHkmpa-642zAm5HqLjFCZdS7wY4EBMFEi_jQ5LePTHTvyGsP1B2YrmOIZKDxYbSj2ghz-MIV',
    fromproduct: 'jsapi',
    ie: 'utf-8',
    wd: name,
    ak: 'dASz7ubuSpHidP1oQWKuAK3q',
    c: '315',
    qt: 's'
  })
}
const getRangeByName = (params) => {
  let { name, x, y, range } = params
  x = parseFloat(x).toFixed(2)
  y = parseFloat(y).toFixed(2)
  range = parseInt(range)
  return getAction('https://api.map.baidu.com', {
    seckey: '322s2tW+KOCRtlNEI7QoDgrHyBFio/12KXiWaBAlqpE=,g6RfdT6x9IptsBJfCxRFU0eB9tmB-rXN6KveOFTXrTqjnZB-92193PYnw3aV5-rQZ0Qcl6xDEfHZBg44kIIfHXe8OjMfDSQ9pdB3gCRYHoIux2O_QfVMaNhwIHkmpa-642zAm5HqLjFCZdS7wY4EBMFEi_jQ5LePTHTvyGsP1B2YrmOIZKDxYbSj2ghz-MIV',
    fromproduct: 'jsapi',
    ie: 'utf-8',
    wd: name,
    ak: 'dASz7ubuSpHidP1oQWKuAK3q',
    ar: `${x - range},${y - range};${x + range},${y + range}`,
    c: '315',
    qt: 'bd',
    rn: 10,
    i: 18,
  })
}
module.exports = {
  writeToExcel,
  caculateAverage,
  groupByName,
  readAllExcel,
  readExcel,
  dirExists,
  getMapData,
  getRangeByName,
  sleep
}