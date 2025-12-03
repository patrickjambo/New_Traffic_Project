// src/components/dashboard/StatsCards.js
import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';

const StatsCard = ({ title, value, change, icon: Icon, color = 'primary', delay = 0 }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <Grid item xs={12} sm={6} md={3}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <Card
          sx={{
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              bgcolor: `${color}.main`,
            },
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {title}
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                  {value}
                </Typography>
                {change !== undefined && change !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {isPositive && <TrendingUp fontSize="small" color="success" />}
                    {isNegative && <TrendingDown fontSize="small" color="error" />}
                    {!isPositive && !isNegative && <Remove fontSize="small" color="disabled" />}
                    <Typography
                      variant="body2"
                      color={isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary'}
                    >
                      {isPositive && '+'}
                      {change}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      vs last week
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: `${color}.main`,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {Icon && <Icon sx={{ fontSize: 32 }} />}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );
};

const StatsCards = ({ stats = [] }) => {
  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <StatsCard
          key={stat.title}
          {...stat}
          delay={index * 0.1}
        />
      ))}
    </Grid>
  );
};

export default StatsCards;
export { StatsCard };
