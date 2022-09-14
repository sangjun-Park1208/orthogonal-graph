import pandas as pd
pd.options.display.max_rows=10
pd.options.display.max_columns=10

#bus
fbus=[
    'bus-14.csv',
    'bus-30.csv',
    'bus-57.csv',
    'bus-118.csv',
    'bus-300.csv',
    'bus-1062.csv',
    ]
bus_data=[]
for i in range(len(fbus)) :
    bus_data.append(pd.read_csv(fbus[i]))

#branch
fbranch=[
    'branch-14.csv',
    'branch-30.csv',
    'branch-57.csv',
    'branch-118.csv',
    'branch-300.csv',
    'branch-1062.csv',
    ]
branch_data=[]
for i in range(len(fbranch)) :
    branch_data.append(pd.read_csv(fbranch[i]))

#bus,branch 데이터프레임 생성
s_data=[]
h_data=[]
for i in range(len(bus_data)):
    #bus,branch 데이터프레임 그대로 복사
    s_data.append(pd.DataFrame(bus_data[i]))
    h_data.append(pd.DataFrame(branch_data[i]))
    
#bus 속성(column)에 degree 추가 및 0으로 초기화
for i in range(len(bus_data)):
    s_data[i]['degree']=0

#degree값 구하기
for i in range(len(bus_data)):
    for j in range(len(h_data[i])):
        for k in range(len(s_data[i])):
            if(
                h_data[i].loc[j,'from']==s_data[i].loc[k,'id'] or
                h_data[i].loc[j,'to']==s_data[i].loc[k,'id']
            ):
                s_data[i].loc[k,'degree']+=1

#csv로 다시 저장
for i in range(len(bus_data)):
    s_data[i].to_csv(fbus[i],index=False)