-- Database Creation and use Query
-- create database blogwebsite;
-- use blogwebsite;


-- Table Drop Queries
drop table blogComment;
drop table blogcontent;
drop table user;

-- Blog Website Database Queries

-- User Table
create table user(userId int primary key auto_increment, userName varchar(100) unique key not null, email varchar(320) unique key not null, password varchar(150) not null)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blog Content Table
 create table blogcontent(blogId int primary key auto_increment, blogAuthor int not null, blogTopic varchar(100) not null, blogTitle varchar(100) not null, blogContent text, createdOn TIMESTAMP default CURRENT_TIMESTAMP not null, likes int default 0, dislikes int default 0, privacy Boolean not null, status Boolean not null default true, foreign key(blogAuthor) references user(userID))ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

 -- Blog Comment Table
  create table blogcomment(commentId int primary key auto_increment, blogId int not null, commentContent text, commentedOn TIMESTAMP default CURRENT_TIMESTAMP, status boolean default true, foreign key(blogId) references blogcontent(blogId))ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


desc user;
desc blogcontent;
desc blogcomment;