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
for i,name in enumerate(fbus) :
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
for i,name in enumerate(fbranch) :
    branch_data.append(pd.read_csv(fbranch[i]))

#bus,branch 데이터프레임 생성
s_data=pd.DataFrame(columns=['id','type','pd','qd','bs','area','vmag','vang','degree'])
h_data=pd.DataFrame(columns=['from','to','r','x','b','tap'])



