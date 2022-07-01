import pandas as pd
pd.options.display.max_rows=10
pd.options.display.max_columns=10

#bus 데이터 받기
fbus='./txt/bus-300.txt'
bus_data=open(fbus,"r")
data=bus_data.read().splitlines()
bus_data=[]
for word in data:
    bus_data.append(word.split())
print(bus_data)

#branch 데이터 받기
fbranch='./txt/branch-300.txt'
branch_data=open(fbranch,"r")
data=branch_data.read().splitlines()
branch_data=[]
for word in data:
    branch_data.append(word.split())
print(branch_data)

#bus - id,area
bus=[]
for i in range(len(bus_data)):
    temp=[]
    temp.append(bus_data[i][0])
    bus.append(temp)
print(bus)
        

#branch - from,to
branch=[]
for i in range(len(branch_data)):
    temp=[]
    temp.append(branch_data[i][0])
    temp.append(branch_data[i][1])
    branch.append(temp)
print(branch)

#bus dataframe
s_data=pd.DataFrame(data=bus,columns=['id'])

#branch dataframe
h_data=pd.DataFrame(data=branch,columns=['from','to'])

s_data.to_csv('bus-300.csv',index=False)
s_data.to_csv('branch-300.csv',index=False)