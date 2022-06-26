from tabnanny import check
import pandas as pd
pd.options.display.max_rows=10
pd.options.display.max_columns=10

draw=int(input("How many nodes :"))

#bus 데이터 받기
fbus = 'bus-1062.csv'
bus_data=pd.read_csv(fbus)

#branch 데이터 받기
fbranch = 'branch-1062.csv'
branch_data=pd.read_csv(fbranch)

#branch
check_list=[]
for i in range(0,len(bus_data)) :
    check_list.append(None)
bus_data['branch_check']=check_list

#bus, branch 데이터프레임 생성
s_data=pd.DataFrame(columns=['id','type','pd','qd','bs','area','vmag','vang'])
h_data=pd.DataFrame(columns=['from','to','r','x','b','tap'])

#branch 랜덤 인덱스 생성
import  random
random_branch=[]
for i in range(0,len(branch_data)) :
    random_branch.append(i)
random.shuffle(random_branch)

while(True) :
    for i in range(0,len(branch_data)) :
        if len(s_data)>=draw :
            break
        new_branch={
            'from' : [branch_data.iloc[random_branch[i],0]],
            'to' : [branch_data.iloc[random_branch[i],1]],
            'r' : [branch_data.iloc[random_branch[i],2]],
            'x' : [branch_data.iloc[random_branch[i],3]],
            'b' : [branch_data.iloc[random_branch[i],4]],
            'tap' : [branch_data.iloc[random_branch[i],5]],
        }
        new_hdf=pd.DataFrame(new_branch)
        h_data=pd.concat([h_data,new_hdf])
        for j in range(0,len(bus_data)) :
            for k in range(0,2) :
                if bus_data.iloc[j,0]==h_data.iloc[i,k] and bus_data.iloc[j,8]==None :
                    new_bus={
                        'id' : [bus_data.iloc[j,0]],
                        'type' : [bus_data.iloc[j,1]],
                        'pd' : [bus_data.iloc[j,2]],
                        'qd' : [bus_data.iloc[j,3]],
                        'bs' : [bus_data.iloc[j,4]],
                        'area' : [bus_data.iloc[j,5]],
                        'vmag' : [bus_data.iloc[j,6]],
                        'vang' : [bus_data.iloc[j,7]],
                    }
                    bus_data.iloc[j,8]=1
                    new_sdf=pd.DataFrame(new_bus)
                    s_data=pd.concat([s_data,new_sdf])
    if(len(s_data)==draw) :
        print("one more")
        break
    #만약 501개라면 dataframe 초기화 후 다시 반복
    else :
        s_data=pd.DataFrame(columns=['id','type','pd','qd','bs','area','vmag','vang'])
        h_data=pd.DataFrame(columns=['from','to','r','x','b','tap'])
        
        import  random
        random_branch=[]
        for i in range(0,len(branch_data)) :
            random_branch.append(i)
        random.shuffle(random_branch)

s_data.to_csv('my_bus.csv',index=False)
h_data.to_csv('my_branch.csv',index=False)