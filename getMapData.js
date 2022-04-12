const {
  writeToExcel,
  readExcel,
  dirExists,
  getMapData,
  getRangeByName,
  sleep
} = require('./utils')
const _ =require('lodash')
const fs = require('fs-extra')

const tagList = [
  { tag: "交通", list: ["地铁站", "公交站"] },
  { tag: "购物", list: ["地铁站", "公交站"] },
  { tag: "教育", list: ["幼儿园", "小学", "中学", "大学"] },
]

function getLocation(config){
  if (typeof config === 'string') {
    config = JSON.parse(config)
  }
  const content = config.content||[]
  if(content.length===0){
    return null
  }
  const item = content[0] 
  return _.get(item,['ext','detail_info', 'point'])
}
const run = async () => {

  dirExists('./mapRes')
  dirExists('./mapRes/locationData')

  const { columns, dataSource } = readExcel('./processResult/小区统计.xlsx')[0]
  let resMap = {}

  if (fs.existsSync('./mapRes/communityLocation.json')) {
    resMap = fs.readJSONSync('./mapRes/communityLocation.json')
  }
  // for (const item of dataSource) {
  const item = dataSource[0]
  // if (!resMap[item['小区名称']]) {
  let res = await getMapData(item['小区名称'])
  eval('res='+res)
  resMap[item['小区名称']] = res
    fs.writeFileSync('./mapRes/communityLocation.json', JSON.stringify(resMap))
    const locationMap = {}
    for (const tag of tagList) {
      const position = getLocation(res)
      if (position) {
        locationMap[tag.tag] = {}
        for (const childTag of tag.list) {
          let res1 = await getRangeByName({ name: childTag, ...position, range: 4000 })
          // eval('res1='+res1)
          locationMap[tag.tag][childTag] = _.get(res1,'content')
        }
        fs.writeJSONSync(`./mapRes/locationData/${item['小区名称']}.json`,locationMap)
        await sleep(1000)
      }
     
    }

  // }
  // }
  // await writeToExcel({ sheets, path: "./processResult/group.xlsx" })
}
run()

function transSpecialChar(pageStr) {
  if (pageStr != undefined && pageStr != "" && pageStr != 'null') {
      pageStr = pageStr.replace(/\r/g, "\\r");
      pageStr = pageStr.replace(/\n/g, "\\n");
      pageStr = pageStr.replace(/\t/g, "\\t");
      pageStr = pageStr.replace(/\\/g, "\\\\");
      pageStr = pageStr.replace(/"\[{/g, "[{");
      pageStr = pageStr.replace(/}]"/g, "}]");
      // pageStr = pageStr.replace(/("")+/g, '"');
      pageStr = pageStr.replace(/"{"/g, "{\"");
      pageStr = pageStr.replace(/"}"/g, "\"}");
      pageStr = pageStr.replace(/}}"/g, "}}");
      pageStr = pageStr.replace(/\'/g, "&#39;");
      pageStr = pageStr.replace(/ /g, "&nbsp;");
      pageStr = pageStr.replace(/</g, "$lt;");
      pageStr = pageStr.replace(/>/g, "$gt;");
  }
  return pageStr;
}