import React from 'react';
import { Card, CardContent, Typography, Button, CardActions } from '@material-ui/core';
import { Link } from 'react-router-dom';

const ResourceCard = ({ resource }) => {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6">{resource.title}</Typography>
                <Typography color="textSecondary">
                    {resource.type === 'university' &&
                        `${resource.university?.name} • ${resource.domain?.name} • ${resource.subject?.name}`}
                    {resource.type === 'skill' && `Skill: ${resource.skill}`}
                    {resource.type === 'competitive' && `Exam: ${resource.exam}`}
                </Typography>
                <Typography variant="body2" component="p">
                    {resource.description.substring(0, 100)}...
                </Typography>
            </CardContent>
            <CardActions>
                <Button
                    size="small"
                    color="primary"
                    component={Link}
                    to={`/resources/${resource._id}`}
                >
                    View Details
                </Button>
                <Button
                    size="small"
                    color="primary"
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Visit Resource
                </Button>
            </CardActions>
        </Card>
    );
};

export default ResourceCard;