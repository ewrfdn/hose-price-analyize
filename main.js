const {
    writeToExcel,
    caculateAverage,
    groupByName,
    readAllExcel,
    readExcel,
    dirExists
} = require('./utils')
const run = async () => {
    dirExists('./processResult')
    const { columns, dataSource } = readAllExcel()
    const nameMap = groupByName(dataSource)
    caculateAverage(nameMap)
    const sheets = []
    for (const key in nameMap) {
        sheets.push( {
            columns,
            dataSource: nameMap[key],
            name:key
        }
        )
    }
    await writeToExcel({sheets,path:"./processResult/group.xlsx"})
}
run()