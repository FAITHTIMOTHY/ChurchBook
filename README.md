## Run ChurchBook locally

ChurchBook is a client-server application. Do not open `src/frontend/index.html` directly in a browser; the dashboard needs the local API server to retrieve its data.

From the project folder, run:

```powershell
npm.cmd start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser. For development with automatic backend reloads, use `npm.cmd run dev` instead.

### Slide 1
ChuchBook ChMS {Logo}


### Slide 2
Contents
PART I - Project Introduction
What is Churchbook?
What is a ChMS?
 How is Churchbook a ChMS?
 What then is ChurchBook?

Why Churchbook?
Is it necessary?
What problems does it aim to solve?

Who needs ChurchBook?
Who is this software for?
Why do they need it?


### Slide 3
Contents cont.d
PART II - Project Features

General Project features.
Project sub features.
Project additional features.

PART III - Project Structure

Project architecture
Current Players
Required Players
Required Tech stack

PART IV - Appendix


### Slide 4
What is ChurchBook?
Wait a minute. What is ChurchBook anyway?
From the name of the project, one could arrive at one of two possible assumptions:
 That this is an application (yes it is an application), a software, for  taking notes in church maybe during ministerations (lame, i know).
That this is an application for taking some sort of records in the church.
Nothing (They do not have thinking capacity).

Regardless of the assumptions, one thing should be clearly obvious: that this project, is a software. The following slides should present substantial information, which would paint a pretty vivid picture of the project, the details, and the overall features.


### Slide 5
What is ChMS?
One can not come to full understanding, or see the full picture  of this project without understanding two important concepts: Database, and Church Management System (ChMS).
Database: A structured record of data, in any shape or form.
ChMS: (Church Management System), This is a software for management of church activities. It encompasses records, database, and several features that aids in church management.

How is ChurchBook a ChMS?
As the name implies, churchbook is a software that manages church data, along with other features that encompasses management of church activities. In other words, a Church Management System.


### Slide 6
What then is ChurchBook?
ChuchBook is a ChMS, which is a multi tenant based system, comprising of different tenants (churches) logically separated on the same framework and server, storing and managing data while offering numerous other features that facilitate effective and simpler church management.
Put it in simply, it is a software for managing church activities and data. This system would incorporate multi tenancy, which means different tenants, with similar data can host their data over the cloud. This makes data management more effective, less volatile, and boosts accountability. 
In addition to data management, it also incorporates several features as well, making it an all-in-one application for church mamnagement.


### Slide 7
Why ChurchBook?
Is it necessary?
There are already several software for data management such as google sheets, etc and also the old school paper and pen database system, so why ChurchBook?
Put it simply - Peculiarity. The existing systems for management and database are either not sufficient enough, or too bogus. The problem of church management is a lingering issue which has not been spoken about too loudly, just whispered and muttered underneath sighs and frustrations.
 Several churches have solved this problem individually by having their own software built for them specifically. However, not every church has the luxury of rersources or initiative to pull this off. Put it simply, it is a big problem that people feel is not problem enough.  What of the existing database software services? Why do we still have architects when we could all just build the same house over and over again?
 There is a saying that goes “Church problems require church solutions” - Caleb Dondon , 2026. In other words, the solution has to come from within the body of christ, from a christian, a church member who is paying attention enough to identify the problem and understand the solution.
Say goodbye to lost manuscripts and written documents, oral documentation and manual projections and statistics, ChurchBook is a divine initiative that has come to offer a sustainable solution.
In summary, Yes, it is absolutely necessary.


### Slide 8
What problems does it aim to solve?
The accountability problem: Churches often fall into this problem over and over again. Due to human error and margin, certain mistakes and mishaps happen which lead to a breakdown or lack of accountability in church data ranging from finance, inventory, etc. This project aims to plug that hole and put and end to leaking accountability, by giving users the ability to track and monitor important data.
The record problem: This remains a persisting issue in churches even in the year of our lord, 2026. In an era where everything is digitised, churches fail to have a solid record of their members, can not track first timers and defaulters just because there is no concrete record keeping. They do not have proper profile data on their members, such as DoB, address, etc. This project provides a platform for that, presenting a broad and detailed database for evrything church. Manual documents which is widely used currently, is often to bogus and complicated to keep track of. This project simplifies the record keeping process, saving tons of papers and trees in the process. Go Green!
Projections: Currently, churches make projections based on speculations and feelings, rather than facts. This project provides a real time projection, using current data and figures to make calculations on growth or decline, make projections and present them in friendly formats such as graphs, bar chats, pictograms, etc.
Specialisation: Available services for services and databases are seriously rigid, not allowing users to enjoy certain features to meet their particular requirements. This project allows users to make small changes to their requirements, as long as it is within the provided structure. Churches are divided into units and departments, with specialised features for that particular department. For example, the ushering unit has attendance statistics and record, the follow up unit has access to the profile of every member, finance department has financial statistics and projections etc.
Hierachy: It provides special admin status for different levels of church individuals with different levels of access to features, administrative abilities etc
The scope of this section covers some of the problems that this project solve. However, there are numerous other problems not included in this section which would be come more obvious later on.


### Slide 9
Who needs ChurchBook?
Who is this Software For?

There are five categories of end users this project is targeted for. Namely:
The Church.
The Pastor.
The Admins/HODs/Unit Heads.
The member.
The Ordinary Person


### Slide 10
Who needs ChurchBook?
Why do they need ChurchBook?
For Churches: First and most importantly, this project is for the church. It was tailormade for the church and to solve solve specific problems. This project makes management and data keeping, tracking much easier and provides and all-in-one place for most church requirements that concerns data
For Pastors: The primary user and the prime admin. This project helps the pastor to have an eye over almost all data activities of the church, all from the view of his computer screeen. It reduces unnecessary calls and trips, cutting costs and time effectively for the pastor, enabling them to focus on more important issues of the spirit.
For Admins/HODs/Unit Heaads: This project enhances administration abilities by allowing leaders keep track of their members, check the performance of units, and individual members by tracking their attendance, etc.
For the Member: This project helps the church member to track church activities and programmes, contribute to church targets, making them feel more connected to the family by enabling contact sharing, etc.
For the Common Person: This project aids in church growth, by showing people churches around their locality, their features, and enabling them follow programmes and events.


### Slide 11
General Project Features
Main features
Database: This includes online database for chuch registry and data. This includes, but not limited to; Church member database, Financial database, inventory database, etc.

Security & Privacy: This project incorporates features like isolation and secure authentication and 
authorisation to protect user data and ensure user data is not accessed by who shouldn’t.

Attendance: This feature enables attendance metric to be attached to individual user profile, so attendance can be properly tracked and recorded.

Individual & Church Profile: Each member and church have their unique profiles upon registration which would include, but not limited to; address, name, email, profile picture, etc.


### Slide 12
General Project Features
Secondary Features
Unit Speciality: This means that for certain units, certain features that suit their duties would be available, certain features would be absent. For instance, the inventory feature for the Technical Unit, sanctuary, and instrumentalist team, the attendance feature for the follow up and ushering, the profile access feature for the follow up etc.

Flexibility: Flexibility will be provided such that, certain admins can make certain alterations and changes to the application. For example, the pastors can create and delete units, HODs can create subunits, add features to their departments, etc.

Hierachy: This implies that there would be well laid out hierchy of users of the application, which defines . For example, the pastor is the ultimate admin of his church with total control and access over the system, HODs having control over their units, etc.


### Slide 13
General Project Features
Calculations and Projections: This application makes calculations easier. It incorporates logic to make calculations on financial and non financial basis, make projections, etc.

Broadcast Messaging: This would enable certain admin to be able to send bulk messages or sms to all or specific people within the church.

Special Features
Payment System: Users would be able to add their card details, so they can pay directly to the church account through the application, offerings, tithes, and donations. Secure end to end payment systems so the transaction is not compromised.


### Slide 14
Project sub Features
Database: This includes online database for chuch registry and data. This includes, but not limited to; 
Members database: This is the database for all members in the church. This is a general database regardless of units or departments. New members are registered on the database.
Unit database: This is a sub database for church departments and sub units.
Financial database: This a database for all the financial activities of the church. This includes records on donatiions, tithes and offerings, contributions, etc. Specialised for the financial department and senior Pastor alone.
Inventory Database: A database for church equipments, properties and facilities. Also, a “status” section to monitor the status of the inventory to record status such as “Faulty” or “Unavailable”.


### Slide 15
Project sub Features
Attendance:
 This feature would enable urshers take attendance of members in every church service or programme.
 Attendance would be directly linked to members’ profiles so there can be a record available to show the attendance performance of each member in the church, which can be used by the pastor, the follow up team to perform their respective duties. 
The attendance page will have a list of every member of the church, which can be searched by name, or id, enabling the uersher to tick the member present. Any member not present till the end of the service duration is automatically ticked absent. 
There would be attendance statistics which would be attached to profiles.
Workers would have a special attendance record which would enable HODs, admins, the Pastor to track the activeness and performance.
First timers and New members: It would enable the church to properly document and track first timers.


### Slide 16
Project sub Features
Individual & Church Profile:
Individual:
The individual profile would have a profile of every member, which would include; name, address, profile picture, email, phone, DoB (Year excluded), attendance record, status (active or inactive. Anyone absent for a month is  tagged inactive.), unit, position.
Full Profile of every member can be accessed by the senior Pastor, others would have some level of access e.g ushering unit has access to attendance record alone.
